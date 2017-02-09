package org.fogbowcloud.sebal.engine.sebal.bootstrap;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

import org.apache.log4j.Logger;

public class DBMain {

	private static final String DEFAULT_SEBAL_VERSION = "default_sebal_version";
	
	private static final Logger LOGGER = Logger.getLogger(DBMain.class);

	public static void main(String[] args) throws Exception {

		if (args.length < 2) {
			System.err.println("Usage: DBMain /path/to/sebal.conf [add,list,list-corrupted,get,purge] [options]");
			System.exit(1);
		}

		String confPath = args[0];

		final Properties properties = new Properties();

		FileInputStream input = null;
		try {
			input = new FileInputStream(confPath);
		} catch (FileNotFoundException e) {
			String errorMsg = confPath + " is not a regular file or does not exist";
			LOGGER.error(errorMsg, e);
			System.err.println(errorMsg);
			System.exit(1);
		}

		try {
			properties.load(input);
		} catch (IOException e) {
			String errorMsg = "Error loading properties";
			LOGGER.error(errorMsg, e);
			System.err.println(errorMsg);
			System.exit(1);
		}

		String command = args[1];
		DBUtilsImpl dbUtilsImpl = new DBUtilsImpl(properties);

		if (command.equals("add")) {

			// TODO: one more field corresponding to SEBAL software version
			if (args.length < 5) {
				System.err.println("Usage: DBMain /path/to/sebal.conf add firstYear lastYear /path/to/regions/file"
						+ " [--sebal-repository] urlToRepository tagFromRepository");
				System.exit(1);
			}

			int firstYear;
			int lastYear;
			String sebalVersion = null;
			String sebalTag = null;

			if (args.length > 5) {
				String opt = args[6];
				if (opt.equals("--sebal-repository")) {
					// pinpoint specific SEBAL software version to be used in
					// Worker
					sebalVersion = args[7];
					sebalTag = args[8];
					
					if(sebalTag == null || sebalTag.isEmpty()) {
						LOGGER.error("Invalid tag. Insert a valid one");
						System.exit(1);
					}
				} else {
					sebalVersion = properties.getProperty(DEFAULT_SEBAL_VERSION);
					sebalTag = "NE";
				}
			} else {
				sebalVersion = properties.getProperty(DEFAULT_SEBAL_VERSION);
				sebalTag = "NE";
			}

			try {
				firstYear = new Integer(args[2]);
				lastYear = new Integer(args[3]);
				try {
					List<String> regions = getRegions(args[4]);
					dbUtilsImpl.fillDB(firstYear, lastYear, regions, sebalVersion, sebalTag);
				} catch (IOException e) {
					String errorMsg = "Error while reading regions from file path " + args[4];
					LOGGER.error(errorMsg, e);
					System.err.println(errorMsg);
					System.exit(1);
				}
			} catch (NumberFormatException e) {
				String errorMsg = "Wrong format firstYear: " + args[2] + " lastYear: " + args[3];
				LOGGER.error(errorMsg, e);
				System.err.println(errorMsg);
				System.exit(1);
			}

		} else if (command.equals("list")) {
			dbUtilsImpl.listImagesInDB();
		} else if (command.equals("list-corrupted")) {
			dbUtilsImpl.listCorruptedImages();
		} else if (command.equals("get")) {

			if (args.length < 5) {
				System.err.println("Usage: DBMain /path/to/sebal.conf get firstYear lastYear region");
				System.exit(1);
			}

			int firstYear;
			int lastYear;

			try {
				firstYear = new Integer(args[2]);
				lastYear = new Integer(args[3]);
				String region = args[4];

				dbUtilsImpl.getRegionImages(firstYear, lastYear, region);
			} catch (NumberFormatException e) {
				String errorMsg = "Wrong format firstYear: " + args[2] + " lastYear: " + args[3];
				LOGGER.error(errorMsg, e);
				System.err.println(errorMsg);
				System.exit(1);
			}
		} else if(command.equals("purge")) {

			if (args.length < 3) {
				System.err.println("Usage: DBMain /path/to/sebal.conf purge day [-f]");
				System.exit(1);
			}

			String day = args[2];

			if (args.length <= 3) {
				dbUtilsImpl.setImagesToPurge(day, false);
			} else if (args.length > 3 ) {
				String opt = args[3];
				dbUtilsImpl.setImagesToPurge(day, opt.equals("-f"));
			}
		}
	}

	private static List<String> getRegions(String filePath) throws IOException {

		List<String> regions = new ArrayList<String>();

		BufferedReader br = null;
		try {
			br = new BufferedReader(new FileReader(filePath));
			String line;
			while ((line = br.readLine()) != null) {
				regions.add(line);
			}
		} finally {
			if (br != null) {
				br.close();
			}
		}

		return regions;
	}

}
