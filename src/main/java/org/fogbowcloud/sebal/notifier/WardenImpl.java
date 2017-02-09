package org.fogbowcloud.sebal.notifier;

import java.io.FileInputStream;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Properties;

import javax.mail.MessagingException;
import javax.mail.internet.AddressException;

import org.apache.log4j.Logger;
import org.fogbowcloud.sebal.engine.sebal.ImageData;
import org.fogbowcloud.sebal.engine.sebal.bootstrap.DBUtilsImpl;

public class WardenImpl implements Warden {

	private Properties properties;
	private DBUtilsImpl dbUtilsImpl;

	public static final Logger LOGGER = Logger.getLogger(WardenImpl.class);

	private static final String CONF_PATH = "config/sebal.conf";
	private static final String NOREPLY_EMAIL = "noreply_email";
	private static final String NOREPLY_PASSWORD = "noreply_password";
	private static final String DEFAULT_SLEEP_TIME = "default_sleep_time";

	public WardenImpl() {
		try {
			properties = new Properties();
			FileInputStream input = new FileInputStream(CONF_PATH);
			properties.load(input);

			dbUtilsImpl = new DBUtilsImpl(properties);
		} catch (IOException e) {
			LOGGER.error("Error while getting properties", e);
		} catch (SQLException e) {
			LOGGER.error("Error while initializing DBUtilsImpl", e);
		}
	}

	// TODO: see if this will be runnable
	public void init() {

		while (true) {
			Collection<Ward> notified = new LinkedList<Ward>();
			for (Ward ward : getPending()) {
				ImageData imageData = getImageData(ward.getImageName());
				if (reached(ward, imageData)) {
					try {
						if (doNotify(ward.getEmail(), ward.getJobId(),
								imageData)) {
							notified.add(ward);
						}
					} catch (Throwable e) {
						LOGGER.error(
								"Could not notify the user on: "
										+ ward.getEmail() + " about " + ward, e);
					}
				}
			}

			removeNotified(notified);
			try {
				Thread.sleep(Long.valueOf(properties
						.getProperty(DEFAULT_SLEEP_TIME)));
			} catch (InterruptedException e) {
				LOGGER.error("Thread error while sleep", e);
			}
		}
	}

	@Override
	public boolean doNotify(String email, String jobId, ImageData context) {

		String subject = "IMAGE " + context.getName() + " WITH JOB_ID " + jobId
				+ " FETCHED";

		String message = "The image " + context.getName()
				+ " was FETCHED into swift.\n" + context.formatedToString();

		try {
			GoogleMail.Send(properties.getProperty(NOREPLY_EMAIL),
					properties.getProperty(NOREPLY_PASSWORD), email, subject,
					message);
			return true;
		} catch (AddressException e) {
			LOGGER.error("Error while sending email to " + email, e);
		} catch (MessagingException e) {
			LOGGER.error("Error while sending email to " + email, e);
		}

		return false;
	}

	protected void removeNotified(Collection<Ward> notified) {

		try {
			for (Ward ward : notified) {
				dbUtilsImpl.removeUserNotify(ward.getJobId(),
						ward.getImageName(), ward.getEmail());
			}
		} catch (SQLException e) {
			LOGGER.error("Error while accessing database", e);
		} catch (NullPointerException e) {
			LOGGER.error("Ward list is null", e);
		}
	}

	protected ImageData getImageData(String imageName) {

		try {
			return dbUtilsImpl.getImageInDB(imageName);
		} catch (SQLException e) {
			LOGGER.error("Error while accessing database", e);
		}

		return null;
	}

	protected List<Ward> getPending() {

		List<Ward> wards = new ArrayList<Ward>();

		try {
			wards = dbUtilsImpl.getUsersToNotify();
		} catch (SQLException e) {
			LOGGER.error("Error while accessing database", e);
		}

		return wards;
	}

	protected boolean reached(Ward ward, ImageData imageData) {

		// TODO: see if this works
		return (imageData.getState().ordinal() >= ward.getTargetState()
				.ordinal());
	}
}
