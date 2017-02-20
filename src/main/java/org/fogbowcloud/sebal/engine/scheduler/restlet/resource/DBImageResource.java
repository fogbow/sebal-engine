package org.fogbowcloud.sebal.engine.scheduler.restlet.resource;

import java.io.FileInputStream;
import java.util.List;
import java.util.Properties;
import java.util.UUID;

import org.apache.commons.httpclient.HttpStatus;
import org.apache.log4j.Logger;
import org.fogbowcloud.sebal.engine.scheduler.restlet.DatabaseApplication;
import org.fogbowcloud.sebal.engine.sebal.ImageData;
import org.json.JSONArray;
import org.json.JSONException;
import org.restlet.data.Form;
import org.restlet.data.Header;
import org.restlet.data.MediaType;
import org.restlet.representation.Representation;
import org.restlet.representation.StringRepresentation;
import org.restlet.resource.Delete;
import org.restlet.resource.Get;
import org.restlet.resource.Post;
import org.restlet.resource.Put;
import org.restlet.resource.ResourceException;
import org.restlet.util.Series;

public class DBImageResource extends BaseResource {

	private static final String PURGE_MESSAGE_OK = "Images purged from database";
	private static final String IMAGE_NAME = "imageName";
	private static final String FIRST_YEAR = "firstYear";
	private static final String LAST_YEAR = "lastYear";
	private static final String REGION = "region";
	private static final String SEBAL_VERSION = "sebalVersion";
	private static final String SEBAL_TAG = "sebalTag";
	private static final String DAY = "day";
	private static final String FORCE = "force";

	private static final Logger LOGGER = Logger
			.getLogger(DBImageResource.class);

	private static final String ADD_IMAGES_MESSAGE_OK = "Images successfully added";
	private static final CharSequence UPDATE_IMAGE_MESSAGE_OK = "Image successfully updated";

	private static final String USER_EMAIL = "userEmail";
	private static final String USER_PASSWORD = "userPass";

	private static final String DEFAULT_CONF_PATH = "config/sebal.conf";
	private static final String DEFAULT_SEBAL_VERSION = "default_sebal_version";

	public DBImageResource() {
		super();
	}

	@SuppressWarnings("unchecked")
	@Get
	public Representation getImages() throws Exception {
		Series<Header> series = (Series<Header>) getRequestAttributes().get(
				"org.restlet.http.headers");

		String userEmail = series.getFirstValue(USER_EMAIL, true);
		String userPass = series.getFirstValue(USER_PASSWORD, true);

		if (!authenticateUser(userEmail, userPass)) {
			throw new ResourceException(HttpStatus.SC_UNAUTHORIZED);
		}

		LOGGER.info("Getting image");
		String imageName = (String) getRequest().getAttributes().get("imgName");

		LOGGER.debug("ImageName is " + imageName);

		if (imageName != null) {
			ImageData imageData = ((DatabaseApplication) getApplication())
					.getImage(imageName);
			JSONArray image = new JSONArray();
			try {
				image.put(imageData.toJSON());
			} catch (JSONException e) {
				LOGGER.error("Error while creating JSON from image data "
						+ imageData, e);
			}

			return new StringRepresentation(image.toString(),
					MediaType.APPLICATION_JSON);
		}

		LOGGER.info("Getting all images");

		List<ImageData> listOfImages = ((DatabaseApplication) getApplication())
				.getImages();
		JSONArray images = new JSONArray();

		for (ImageData imageData : listOfImages) {
			try {
				images.put(imageData.toJSON());
			} catch (JSONException e) {
				LOGGER.error("Error while creating JSON from image data "
						+ imageData, e);
			}
		}

		return new StringRepresentation(images.toString(),
				MediaType.APPLICATION_JSON);
	}

	@Post
	public StringRepresentation insertImages(Representation entity)
			throws Exception {
		
		Properties properties = new Properties();
		FileInputStream input = new FileInputStream(DEFAULT_CONF_PATH);
		properties.load(input);

		Form form = new Form(entity);

		String userEmail = form.getFirstValue(USER_EMAIL, true);
		String userPass = form.getFirstValue(USER_PASSWORD, true);
		
		LOGGER.debug("POST with userEmail " + userEmail);
		if (!authenticateUser(userEmail, userPass)) {
			throw new ResourceException(HttpStatus.SC_UNAUTHORIZED);
		}

		int firstYear = new Integer(form.getFirstValue(FIRST_YEAR));
		int lastYear = new Integer(form.getFirstValue(LAST_YEAR));
		String region = form.getFirstValue(REGION);
		String sebalVersion = form.getFirstValue(SEBAL_VERSION);
		String sebalTag = form.getFirstValue(SEBAL_TAG);
		LOGGER.debug("FirstYear " + firstYear + " LastYear " + lastYear + " Region " + region);
		
		try {		
			
			if (region == null || region.isEmpty()) {
				throw new ResourceException(HttpStatus.SC_BAD_REQUEST);
			}	
			
			if (sebalVersion == null || sebalVersion.isEmpty()) {
				sebalVersion = properties.getProperty(DEFAULT_SEBAL_VERSION);
				sebalTag = "NE";
				
				LOGGER.debug("SebalVersion not passed...using default repository " + sebalVersion);
			} else {
				if (sebalTag == null || sebalTag.isEmpty()) {
					throw new ResourceException(HttpStatus.SC_BAD_REQUEST);
				}
			}
			
			List<String> imageNames = application.addImages(firstYear,
					lastYear, region, sebalVersion, sebalTag);
			if (application.isUserNotifiable(userEmail)) {
				
				String jobId = UUID.randomUUID().toString();
				for (String imageName : imageNames) {
					application.addUserNotify(jobId, imageName, userEmail);
				}
			}
		} catch (Exception e) {
			LOGGER.debug(e.getMessage(), e);
			throw new ResourceException(HttpStatus.SC_BAD_REQUEST, e);
		}

		return new StringRepresentation(ADD_IMAGES_MESSAGE_OK,
				MediaType.APPLICATION_JSON);
	}
	
	@Put
	public StringRepresentation updateSebalVersion(Representation entity)
			throws Exception {
		
		Properties properties = new Properties();
		FileInputStream input = new FileInputStream(DEFAULT_CONF_PATH);
		properties.load(input);

		Form form = new Form(entity);

		String userEmail = form.getFirstValue(USER_EMAIL, true);
		String userPass = form.getFirstValue(USER_PASSWORD, true);
		
		LOGGER.debug("PUT with userEmail " + userEmail);
		if (!authenticateUser(userEmail, userPass)) {
			throw new ResourceException(HttpStatus.SC_UNAUTHORIZED);
		}

		String imageName = form.getFirstValue(IMAGE_NAME);
		String sebalVersion = form.getFirstValue(SEBAL_VERSION);
		String sebalTag = form.getFirstValue(SEBAL_TAG);
		LOGGER.debug("ImageName " + imageName + " SebalVersion " + sebalVersion
				+ " SebalTag " + sebalTag);
		
		try {
			
			if (imageName == null || imageName.isEmpty()
					|| sebalVersion == null || sebalVersion.isEmpty()
					|| sebalTag == null || sebalTag.isEmpty()) {
				throw new ResourceException(HttpStatus.SC_BAD_REQUEST);
			}

			application.updateImageToPhase2(imageName, sebalVersion, sebalTag);
			
			if (application.isUserNotifiable(userEmail)) {
				String jobId = UUID.randomUUID().toString();
				application.addUserNotify(jobId, imageName, userEmail);
			}
		} catch (Exception e) {
			LOGGER.debug(e.getMessage(), e);
			throw new ResourceException(HttpStatus.SC_BAD_REQUEST, e);
		}

		return new StringRepresentation(UPDATE_IMAGE_MESSAGE_OK,
				MediaType.APPLICATION_JSON);
	}

	@Delete
	public StringRepresentation purgeImage(Representation entity)
			throws Exception {

		Form form = new Form(entity);

		String userEmail = form.getFirstValue(USER_EMAIL, true);
		String userPass = form.getFirstValue(USER_PASSWORD, true);

		LOGGER.debug("DELETE with userEmail " + userEmail);
		
		boolean mustBeAdmin = true;
		if (!authenticateUser(userEmail, userPass, mustBeAdmin)) {
			throw new ResourceException(HttpStatus.SC_UNAUTHORIZED);
		}

		String day = form.getFirstValue(DAY);
		String force = form.getFirstValue(FORCE);

		LOGGER.debug("Purging images from day " + day);
		DatabaseApplication application = (DatabaseApplication) getApplication();

		try {
			application.purgeImage(day, force);
		} catch (Exception e) {
			LOGGER.debug(e.getMessage(), e);
			throw new ResourceException(HttpStatus.SC_BAD_REQUEST, e);
		}

		return new StringRepresentation(PURGE_MESSAGE_OK,
				MediaType.APPLICATION_JSON);
	}

}
