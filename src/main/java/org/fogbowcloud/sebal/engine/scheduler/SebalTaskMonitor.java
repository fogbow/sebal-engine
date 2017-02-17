package org.fogbowcloud.sebal.engine.scheduler;

import java.sql.SQLException;

import org.apache.log4j.Logger;
import org.fogbowcloud.blowout.core.model.Task;
import org.fogbowcloud.blowout.core.model.TaskProcess;
import org.fogbowcloud.blowout.core.model.TaskState;
import org.fogbowcloud.blowout.core.monitor.TaskMonitor;
import org.fogbowcloud.blowout.infrastructure.model.ResourceState;
import org.fogbowcloud.blowout.pool.BlowoutPool;
import org.fogbowcloud.sebal.engine.sebal.ImageData;
import org.fogbowcloud.sebal.engine.sebal.ImageDataStore;
import org.fogbowcloud.sebal.engine.sebal.ImageState;
import org.fogbowcloud.sebal.engine.sebal.SebalTasks;

public class SebalTaskMonitor extends TaskMonitor {
	private static final Logger LOGGER = Logger.getLogger(SebalTaskMonitor.class);

	
	ImageDataStore imageStore;

	public SebalTaskMonitor(BlowoutPool blowoutPool, ImageDataStore imageStore,
			Integer period) {
		super(blowoutPool, period);
		this.imageStore = imageStore;
		try {
			for (Task task : blowoutPool.getAllTasks()) {				
				if (task.getMetadata(SebalTasks.METADATA_TASK_START_EXECUTION_TIME)
						.isEmpty()
						|| task.getMetadata(SebalTasks.METADATA_TASK_START_EXECUTION_TIME) == null) {					
					task.putMetadata(SebalTasks.METADATA_TASK_START_EXECUTION_TIME, String.valueOf(System.currentTimeMillis()));
				}
				
				imageToRunning(task.getMetadata("ImageName"));
			}
		} catch (SQLException e) {
			LOGGER.debug("Could not change image state to RUNNING", e);
		}
	}

	private void imageToRunning(String image) throws SQLException {
		ImageData imageData = this.imageStore.getImage(image);
		
		// TODO: test this
		if(!imageData.getState().equals(ImageState.RUNNING)) {
			imageData.setState(ImageState.RUNNING);
			imageStore.updateImage(imageData);

			// Inserting update time into stateStamps table in DB
			imageData.setUpdateTime(imageStore.getImage(imageData.getName())
					.getUpdateTime());
			imageStore.addStateStamp(imageData.getName(), imageData.getState(),
					imageData.getUpdateTime());
		}
	}

	private void imageToFinnished(String imageName) throws SQLException {
		ImageData imageData = this.imageStore.getImage(imageName);
		imageData.setState(ImageState.FINISHED);
		imageStore.updateImage(imageData);
		
		// Inserting update time into stateStamps table in DB
		imageData.setUpdateTime(imageStore.getImage(imageData.getName()).getUpdateTime());
		imageStore.addStateStamp(imageData.getName(), imageData.getState(), imageData.getUpdateTime());
	}

	private void imageToFailed(String imageName) throws SQLException {
		ImageData imageData = this.imageStore.getImage(imageName);
		imageData.setState(ImageState.QUEUED);
		imageStore.updateImage(imageData);
		
		// Inserting update time into stateStamps table in DB
		imageData.setUpdateTime(imageStore.getImage(imageData.getName()).getUpdateTime());
		imageStore.addStateStamp(imageData.getName(), imageData.getState(), imageData.getUpdateTime());
	}
	
	@Override
	public void procMon() {
		for (TaskProcess tp : getRunningProcesses()) {
			if(tp.getStatus().equals(TaskState.RUNNING)){
				checkTaskDuration(tp);
			}			
			if (tp.getStatus().equals(TaskState.FAILED)) {
				getRunningTasks().remove(getTaskById(tp.getTaskId()));
				if (tp.getResource()!= null) {
					getBlowoutPool().updateResource(tp.getResource(), ResourceState.FAILED);
				}
				failure(tp);
			}
			if (tp.getStatus().equals(TaskState.FINNISHED)) {
				Task task = getTaskById(tp.getTaskId());
				task.finish();
				getRunningTasks().remove(task);
				if (tp.getResource()!= null) {
					getBlowoutPool().updateResource(tp.getResource(), ResourceState.IDLE);
				}
				completion(tp);
			}
		}
	}

	private void checkTaskDuration(TaskProcess tp) throws NumberFormatException {
		Task task = getBlowoutPool().getTaskById(
				tp.getTaskId());
		
		long taskStartTime = Long.valueOf(task.getMetadata(
				SebalTasks.METADATA_TASK_START_EXECUTION_TIME));							
		
		long diff = taskStartTime - System.currentTimeMillis();
		long diffHours = diff / (60 * 60 * 1000);
		
		LOGGER.debug("Current task duration in hours is " + diffHours);
		
		if(diffHours >= Long.valueOf(task.getMetadata(SebalTasks.METADATA_MAX_TASK_EXECUTION_TIME))) {
			LOGGER.debug("Task maximum duration "
					+ task.getMetadata(SebalTasks.METADATA_MAX_TASK_EXECUTION_TIME)
					+ " surpassed. Marking task as " + TaskState.FAILED);
			
			tp.setStatus(TaskState.FAILED);
		}
	}
	
	public void failure(TaskProcess tp) {
		String imageName = getBlowoutPool().getTaskById(tp.getTaskId()).getMetadata(SebalTasks.METADATA_IMAGE_NAME); 
		try {
			imageToFailed(imageName);
		} catch (SQLException e) {
			LOGGER.debug("Could not change image '" + imageName + "' state to Finnished", e);
		}
	}

	public void completion(TaskProcess tp) {
		String imageName = getBlowoutPool().getTaskById(tp.getTaskId()).getMetadata(SebalTasks.METADATA_IMAGE_NAME);
		try {
			imageToFinnished(imageName);
		} catch (SQLException e) {
			LOGGER.debug("Could not change image '" + imageName + "' state to Finnished", e);
		}
	}

}
