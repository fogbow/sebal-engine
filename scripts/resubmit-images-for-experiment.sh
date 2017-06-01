#!/bin/bash
image_list_file_path=$1
federation_member=$2
swift_temp_url_key=$3
temp_url_expiration_time=$4

# Swift constants
SWIFT_URL=
SWIFT_DESIRED_PSEUDO_PATH=

# Scheduler constants
SCHEDULER_IP=
SCHEDULER_DB_PORT=
SEBAL_DB_NAME=
SEBAL_DB_USER=
SEBAL_DB_PASSWORD=
IMAGES_TABLE_NAME=

# Application constants
SEBAL_TAG=e078b8e6f46e6810bc3f41a3e64334073b6ccfd9

function setPasswordAccessDB {
  # Setting password to access db
  file="$HOME/.pgpass"
  if [ -f "$file" ]
  then
    echo "Replacing $file now."
    rm -f $file
  else
    echo "$file not found. Creating one now"
  fi

  # Writing password in .pgpass and changing permissions
  echo "$SCHEDULER_IP:$SCHEDULER_DB_PORT:$SEBAL_DB_NAME:$SEBAL_DB_USER:$SEBAL_DB_PASSWORD" >> $file
  chmod 0600 "$file"
}

function init {
  while read line; do
    echo "Getting $line temporary swift file url"
    image_temp_url_endpoint=$(swift tempurl GET $temp_url_expiration_time $SWIFT_DESIRED_PSEUDO_PATH/$line/$line".tar.gz" $swift_temp_url_key)
    image_full_temp_url=$SWIFT_URL$image_temp_url_endpoint

    setPasswordAccessDB

    echo "Rolling back $line to 'selected' state in database"
    psql_cmd="UPDATE $IMAGES_TABLE_NAME SET state = 'selected', federation_member = '$federation_member', download_link = '$image_full_temp_url', sebal_tag = 'e078b8e6f46e6810bc3f41a3e64334073b6ccfd9' WHERE image_name = '$line';"
    psql -h $SCHEDULER_IP -U $SEBAL_DB_USER -c "$psql_cmd" $SEBAL_DB_NAME
  done <$image_list_file_path
}

setPasswordAccessDB
init