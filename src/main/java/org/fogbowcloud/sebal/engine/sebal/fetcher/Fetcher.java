package org.fogbowcloud.sebal.engine.sebal.fetcher;

import java.io.File;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ConcurrentMap;

import org.apache.commons.io.FileUtils;
import org.apache.log4j.Logger;
import org.fogbowcloud.blowout.scheduler.core.util.AppPropertiesConstants;
import org.fogbowcloud.sebal.engine.sebal.ImageData;
import org.fogbowcloud.sebal.engine.sebal.ImageDataStore;
import org.fogbowcloud.sebal.engine.sebal.ImageState;
import org.fogbowcloud.sebal.engine.sebal.JDBCImageDataStore;
import org.fogbowcloud.sebal.engine.sebal.ProcessUtil;
import org.fogbowcloud.sebal.engine.swift.SwiftClient;
import org.mapdb.DB;
import org.mapdb.DBMaker;

public class Fetcher {

	protected static final String SEBAL_EXPORT_PATH = "sebal_export_path";
	protected static final String FETCHER_RESULTS_PATH = "fetcher_volume_path";
	private final Properties properties;
	private final ImageDataStore imageStore;
	private final SwiftClient swiftClient;
	private File pendingImageFetchFile;
	private DB pendingImageFetchDB;
	private ConcurrentMap<String, ImageData> pendingImageFetchMap;
	private FTPIntegrationImpl ftpImpl;
	private FetcherHelper fetcherHelper;
	private String fetcherVersion;

	private String ftpServerIP;
	private String ftpServerPort;

	private static int MAX_FETCH_TRIES = 2;
	private static int MAX_SWIFT_UPLOAD_TRIES = 2;
	private static final long DEFAULT_SCHEDULER_PERIOD = 60000; // 5 minutes

	public static final Logger LOGGER = Logger.getLogger(Fetcher.class);

	public Fetcher(Properties properties, String ftpServerIP, String ftpServerPort) throws SQLException {

		this(properties, new JDBCImageDataStore(properties), ftpServerIP, ftpServerPort, new SwiftClient(
				properties), new FTPIntegrationImpl(), new FetcherHelper());

		LOGGER.info("Creating fetcher");
		LOGGER.debug("Imagestore " + properties.getProperty("datastore_ip") + ":" + properties.getProperty("datastore_port")
				+ " FTPServer " + ftpServerIP + ":" + ftpServerPort);
	}

	protected Fetcher(Properties properties, ImageDataStore imageStore,
			String ftpServerIP, String ftpServerPort, SwiftClient swiftClient,
			FTPIntegrationImpl ftpImpl, FetcherHelper fetcherHelper) {

		if (properties == null) {
			throw new IllegalArgumentException(
					"Properties arg must not be null.");
		}

		if (imageStore == null) {
			throw new IllegalArgumentException(
					"Imagestore arg must not be null.");
		}

		this.properties = properties;
		this.imageStore = imageStore;
		this.ftpServerIP = ftpServerIP;
		this.ftpServerPort = ftpServerPort;
		this.swiftClient = swiftClient;
		this.ftpImpl = ftpImpl;
		this.fetcherHelper = fetcherHelper;

		this.pendingImageFetchFile = new File("pending-image-fetch.db");
		this.pendingImageFetchDB = DBMaker.newFileDB(pendingImageFetchFile)
				.make();

		if (!pendingImageFetchFile.exists() || !pendingImageFetchFile.isFile()) {
			LOGGER.info("Creating map of pending images to fetch");
			this.pendingImageFetchMap = pendingImageFetchDB
					.createHashMap("map").make();
		} else {
			LOGGER.info("Loading map of pending images to fetch");
			this.pendingImageFetchMap = pendingImageFetchDB.getHashMap("map");
		}
	}

	public void exec() throws Exception {

		try {
			if(!versionFileExists()) {
				System.exit(1);
			}
			
			while (true) {
				cleanUnfinishedFetchedData(properties);
				List<ImageData> imagesToFetch = imagesToFetch();
				for (ImageData imageData : imagesToFetch) {
					if (!imageData.getImageStatus().equals(ImageData.PURGED)) {
						fetchAndUpdateImage(imageData);
					}
				}
				Thread.sleep(DEFAULT_SCHEDULER_PERIOD);
			}
		} catch (InterruptedException e) {
			LOGGER.error("Error while fetching images", e);
		} catch (IOException e) {
			LOGGER.error("Error while fetching images", e);
		}

		pendingImageFetchDB.close();
	}
	
	protected boolean versionFileExists() {
		this.fetcherVersion = getFetcherVersion();
		
		if(fetcherVersion == null || fetcherVersion.isEmpty()) {
			LOGGER.error("Fmask version file does not exist");
			LOGGER.info("Restart Fetcher infrastructure");
						
			return false;
		}
		
		return true;
	}

	protected void cleanUnfinishedFetchedData(Properties properties)
			throws Exception {
		LOGGER.info("Starting garbage collector");
		Collection<ImageData> data = pendingImageFetchMap.values();
		for (ImageData imageData : data) {
			rollBackFetch(imageData);
			deleteResultsFromDisk(imageData, properties);
			deletePendingResultsFromSwift(imageData, properties);
		}
		LOGGER.info("Garbage collect finished");
	}

	private void deletePendingResultsFromSwift(ImageData imageData,
			Properties properties) throws Exception {
		LOGGER.debug("Pending image" + imageData + " still have files in swift");
		deleteFilesFromSwift(imageData, properties);
	}

	protected void deleteResultsFromDisk(final ImageData imageData,
			Properties properties) throws IOException {
		String exportPath = properties.getProperty(SEBAL_EXPORT_PATH);
		String resultsDirPath = exportPath + "/results/" + imageData.getName();
		File resultsDir = new File(resultsDirPath);

		if (resultsDir.exists() && resultsDir.isDirectory()) {
			FileUtils.deleteDirectory(resultsDir);
		} else {
			LOGGER.info("Path " + resultsDirPath
					+ " does not exist or is not a directory!");
		}

	}

	protected List<ImageData> imagesToFetch() {
		try {
			return imageStore.getIn(ImageState.FINISHED);
		} catch (SQLException e) {
			LOGGER.error("Error getting " + ImageState.FINISHED + " images from DB", e);
		}
		return Collections.EMPTY_LIST;
	}

	protected void fetchAndUpdateImage(ImageData imageData) throws IOException,
			InterruptedException {
		try {
			if(prepareFetch(imageData)) {				
				fetch(imageData, MAX_FETCH_TRIES);
				if (!fetcherHelper.isFileCorrupted(imageData, pendingImageFetchMap,
						imageStore) && !fetcherHelper.isImageRolledBack(imageData)) {
					finishFetch(imageData);
				}
			} else {
				LOGGER.error("Could not prepare image " + imageData + " to fetch");
			}
		} catch (Exception e) {
			LOGGER.error("Could not fetch image " + imageData.getName(), e);
			rollBackFetch(imageData);
			if(fetcherHelper.isThereFetchedFiles(properties.getProperty(FETCHER_RESULTS_PATH))) {
				deleteResultsFromDisk(imageData, properties);
			}
		}
	}

	protected boolean prepareFetch(ImageData imageData) throws SQLException,
			IOException {
		LOGGER.debug("Preparing image " + imageData.getName() + " to fetch");
		if (imageStore.lockImage(imageData.getName())) {
			
			imageData.setState(ImageState.FETCHING);
			
			fetcherHelper.updatePendingMapAndDB(imageData,
					pendingImageFetchDB, pendingImageFetchMap);

			try {
				LOGGER.info("Updating image data in DB");
				imageStore.updateImage(imageData);
				imageData.setUpdateTime(imageStore.getImage(imageData.getName()).getUpdateTime());
			} catch (SQLException e) {
				LOGGER.error("Error while updating image " + imageData
						+ " in DB", e);
				rollBackFetch(imageData);
				return false;
			}

			try {
				imageStore.addStateStamp(imageData.getName(),
						imageData.getState(), imageData.getUpdateTime());
			} catch (SQLException e) {
				LOGGER.error("Error while adding state " + imageData.getState()
						+ " timestamp " + imageData.getUpdateTime() + " in DB", e);
			}
			imageStore.unlockImage(imageData.getName());

			LOGGER.debug("Image " + imageData.getName() + " ready to fetch");
		}
		return true;
	}

	protected void finishFetch(ImageData imageData) throws IOException,
			SQLException {

		String localImageResultsPath = fetcherHelper.getLocalImageResultsPath(
				imageData, properties);

		if (fetcherHelper.isThereFetchedFiles(localImageResultsPath)) {

			LOGGER.debug("Finishing fetch for image " + imageData);
			imageData.setState(ImageState.FETCHED);

			String stationId = fetcherHelper
					.getStationId(imageData, properties);
			
			imageData.setStationId(stationId);
			imageData.setFetcherVersion(fetcherVersion);

			try {
				LOGGER.info("Updating image data in DB");
				imageStore.updateImage(imageData);
				imageData.setUpdateTime(imageStore.getImage(imageData.getName()).getUpdateTime());
			} catch (SQLException e) {
				LOGGER.error("Error while updating image " + imageData
						+ " in DB", e);
				rollBackFetch(imageData);
				deleteResultsFromDisk(imageData, properties);
			}

			try {
				imageStore.addStateStamp(imageData.getName(),
						imageData.getState(), imageData.getUpdateTime());
			} catch (SQLException e) {
				LOGGER.error("Error while adding state " + imageData.getState()
						+ " timestamp " + imageData.getUpdateTime() + " in DB", e);
			}
			
			LOGGER.debug("Deleting local results file for "
					+ imageData.getName());
			deleteResultsFromDisk(imageData, properties);

			fetcherHelper.removeImageFromPendingMap(imageData, pendingImageFetchDB, pendingImageFetchMap);

			LOGGER.debug("Image " + imageData.getName() + " fetched");
		} else {
			LOGGER.debug("No " + imageData + " result files fetched");
			rollBackFetch(imageData);
		}
	}

	protected void rollBackFetch(ImageData imageData) {
		LOGGER.debug("Rolling back Fetcher for image " + imageData);

		fetcherHelper.removeImageFromPendingMap(imageData, pendingImageFetchDB, pendingImageFetchMap);
		try {
			imageStore.removeStateStamp(imageData.getName(),
					imageData.getState(), imageData.getUpdateTime());
		} catch (SQLException e) {
			LOGGER.error("Error while removing state " + imageData.getState()
					+ " timestamp", e);
		}
		imageData.setState(ImageState.FINISHED);

		try {
			imageStore.updateImage(imageData);
			imageData.setUpdateTime(imageStore.getImage(imageData.getName()).getUpdateTime());
		} catch (SQLException e) {
			LOGGER.error("Error while updating image data.", e);
			imageData.setState(ImageState.FETCHING);
			fetcherHelper.updatePendingMapAndDB(imageData, pendingImageFetchDB, pendingImageFetchMap);
		}
	}

	protected void fetch(final ImageData imageData, int maxTries) throws Exception {
		// FIXME: doc-it (we want to know the max tries logic)
		LOGGER.debug("MAX_FETCH_TRIES " + MAX_FETCH_TRIES);

		int i;
		for (i = 0; i < maxTries; i++) {

			String remoteImageResultsPath = fetcherHelper
					.getRemoteImageResultsPath(imageData, properties);

			String localImageResultsPath = fetcherHelper
					.getLocalImageResultsPath(imageData, properties);

			File localImageResultsDir = new File(localImageResultsPath);

			if (!localImageResultsDir.exists()) {
				LOGGER.debug("Path " + localImageResultsPath
						+ " not valid or nonexistent. Creating "
						+ localImageResultsPath);
				localImageResultsDir.mkdirs();
			} else if (!localImageResultsDir.isDirectory()) {
				LOGGER.debug(localImageResultsPath
						+ " is a file, not a directory. Deleting it and creating a actual directory");
				localImageResultsDir.delete();
				localImageResultsDir.mkdirs();
			}

			// FIXME: we should test for two different errors cases:
			// i)exception - done
			// ii)error code;
			int exitValue = ftpImpl.getFiles(properties, ftpServerIP,
					ftpServerPort, remoteImageResultsPath,
					localImageResultsPath, imageData);

			if (exitValue == 0) {
				if (fetcherHelper.resultsChecksumOK(imageData, localImageResultsDir)) {
					if(uploadFilesToSwift(imageData, localImageResultsDir)) {						
						break;
					} else {
						return;
					}
				} else {
					if(fetcherHelper.isThereFetchedFiles(localImageResultsPath)) {
						deleteResultsFromDisk(imageData, properties);
					}
				}
			} else {
				rollBackFetch(imageData);
				if (fetcherHelper.isThereFetchedFiles(localImageResultsPath)) {
					deleteResultsFromDisk(imageData, properties);
				}
				break;
			}
		}
		
		if (i >= maxTries) {
			LOGGER.info("Max tries was reached. Marking " + imageData
					+ " as corrupted.");
			imageData.setState(ImageState.CORRUPTED);
			fetcherHelper.removeImageFromPendingMap(imageData,
					pendingImageFetchDB, pendingImageFetchMap);
			// TODO: see if this have to be in try-catch
			imageStore.updateImage(imageData);
			imageData.setUpdateTime(imageStore.getImage(imageData.getName()).getUpdateTime());
		}
	}

	protected boolean uploadFilesToSwift(ImageData imageData, File localImageResultsDir) throws Exception {
		LOGGER.debug("maxSwiftUploadTries=" + MAX_SWIFT_UPLOAD_TRIES);
				
		String pseudoFolder = getPseudoFolder(localImageResultsDir);
		
		String containerName = getContainerName();

		for (File actualFile : localImageResultsDir.listFiles()) {
			LOGGER.debug("Actual file " + actualFile.getName());
			int uploadFileTries;
			for (uploadFileTries = 0; uploadFileTries < MAX_SWIFT_UPLOAD_TRIES; uploadFileTries++) {				
				try {
					LOGGER.debug("Trying to upload file "
							+ actualFile.getName() + " to " + pseudoFolder
							+ " in " + containerName);
					swiftClient.uploadFile(containerName, actualFile,
							pseudoFolder);					
					break;
				} catch (Exception e) {
					LOGGER.error("Error while uploading files to swift", e);
					continue;
				}
			}
			
			if(uploadFileTries >= MAX_SWIFT_UPLOAD_TRIES) {
				rollBackFetch(imageData);
				deleteResultsFromDisk(imageData, properties);
				return false;
			}
		}
		
		LOGGER.info("Upload to swift succsessfully done");
		return true;
	}
	
	protected boolean deleteFilesFromSwift(ImageData imageData, Properties properties) throws Exception {
		LOGGER.debug("Deleting " + imageData + " files from swift");
		String containerName = getContainerName();
		String keystoneToken = generateToken();
		
		// TODO: test this
		ProcessBuilder builder = new ProcessBuilder("swift", "--os-auth-token",
				keystoneToken, "--os-storage-url",
				properties.getProperty("swift_container_url"), "list",
				containerName);
        LOGGER.debug("Executing command " + builder.command());
        
        Process p = builder.start();
        p.waitFor();
        
        String output = ProcessUtil.getOutput(p);
        
        // TODO: test this
        // each file has complete path
        // ex.: fetcher/images/image_name/file.nc
        List<String> fileNames = getOutputLinesIntoList(output);
        
        for(String file : fileNames) {
			if (file.contains(imageData.getName())) {
				try {
					LOGGER.debug("Trying to delete file " + file + " from " + containerName);
					String localImageResultsPath = properties
							.get("fetcher_volume_path")
							+ File.separator
							+ "results" + File.separator + imageData.getName();
					swiftClient.deleteFile(containerName, getPseudoFolder(new File(localImageResultsPath)), file);
				} catch (Exception e) {
					LOGGER.error("Error while deleting files to swift", e);
					return false;
				}
			}
        }
		
		return true;
	}
	
	private List<String> getOutputLinesIntoList(String fileNames) throws IOException {
		List<String> fileNamesList = new ArrayList<String>();
		
		String[] lines = fileNames.split(System.getProperty("line.separator"));
		
		for(int i = 0; i < lines.length; i++) {
			fileNamesList.add(lines[i]);
		}
		
		return fileNamesList;
	}

	private String generateToken() {
		
		String tokenGenerateCommandOutput = null;
		try {
			// FIXME: check this later
			//		  it must get property name relatively
			ProcessBuilder builder = new ProcessBuilder("bash",
					properties.get("fogbow_cli_path") + File.separator
							+ "bin/fogbow-cli", "token", "--create", "--type",
					"openstack",
					"-Dusername="
							+ properties
									.getProperty("fogbow.keystone.username"),
					"-Dpassword="
							+ properties
									.getProperty("fogbow.keystone.password"),
					"-DauthUrl="
							+ properties
									.getProperty("fogbow.keystone.auth.url"),
					"-DtenantName="
							+ properties
									.getProperty("fogbow.keystone.tenantname"));
			LOGGER.debug("Executing command " + builder.command());

			Process p = builder.start();
			p.waitFor();
			
			tokenGenerateCommandOutput = ProcessUtil.getOutput(p);
		} catch (Throwable e) {
			LOGGER.error("Error while generating keystone token", e);
			return null;
		}
		
		return tokenGenerateCommandOutput;
	}

	private String getContainerName() {
		return properties
				.getProperty(AppPropertiesConstants.SWIFT_CONTAINER_NAME);
	}

	private String getPseudoFolder(File localImageResultsDir) {
		return properties
				.getProperty(AppPropertiesConstants.SWIFT_PSEUD_FOLDER_PREFIX) + 
				File.separator + localImageResultsDir.getName() + File.separator;
	}
	
	protected String getFetcherVersion() {
		
		String sebalEngineDirPath = System.getProperty("user.dir");
		File sebalEngineDir = new File(sebalEngineDirPath);
		
		if (sebalEngineDir.exists() && sebalEngineDir.isDirectory()) {
			for (File file : sebalEngineDir.listFiles()) {
				if (file.getName().startsWith("sebal-engine.version.")) {
					String[] sebalEngineVersionFileSplit = file.getName()
							.split("\\.");
					return sebalEngineVersionFileSplit[2];
				}
			}
		}
		
		return "";
	}
}
