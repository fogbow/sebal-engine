#!/bin/bash
image_list_file_path=$1
swift_temp_url_key=$2
temp_url_expiration_time=$3

# Swift constants
SWIFT_URL=
SWIFT_DESIRED_PSEUDO_PATH=

# Application constants
SEBAL_TAG=
LOCAL_FILES_DIR=

function init {
  while read line; do
    echo "Getting $line temporary swift file url"
    image_temp_url_endpoint=$(swift tempurl GET $temp_url_expiration_time $SWIFT_DESIRED_PSEUDO_PATH/$line/$line".tar.gz" $swift_temp_url_key)
    image_full_temp_url=$SWIFT_URL$image_temp_url_endpoint
    
    curl -L -o $LOCAL_FILES_DIR/$line".tar.gz" -X GET "$image_full_temp_url"
  done <$image_list_file_path
}

init
