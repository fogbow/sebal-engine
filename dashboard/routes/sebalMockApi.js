var express = require('express');
var fs = require("fs");
var exec = require('child_process').exec;
var router = express.Router();

var imagesFile = "/mockFiles/images.json";
var regionsFile = "/mockFiles/regions.json";

var response = {
	"status" : undefined,
	"code" : undefined,
	"data" : undefined
}

var startApi = function(){

	console.log("Starting Sebal api");

	var validateUser = function(userInfo){

		console.log("User - "+JSON.stringify(userInfo));

		if(userInfo.userEmail !== "admin@admin.com" || userInfo.userPass !== "admin"){
			
			console.log("invalid user");
			return false;

		}
		console.log("Valid user");
		return true;
	}
	
	var loadFileInfo = function(fileName, callbackFunction){		
		
		fs.readFile( __dirname + fileName, 'utf8', function (err, data) {
		   	
		   	if(err){
				response.status = "ERROR"
				response.code = 500;
				response.data = err
			}else{
				response.status = "SUCCESS"
				response.code = 200;
				response.data = JSON.parse(data)
			}
			callbackFunction(response);

		});
	}

	var api = {
		getImages: function(userInfo, callbackFunction){
			
			if(!validateUser(userInfo)){
				response.status = "ERROR";
				response.code = 401;
				response.data = "User unauthorized";
				callbackFunction(response);
			}else{
				loadFileInfo(imagesFile, callbackFunction);
			}
			loadFileInfo(imagesFile, callbackFunction);

		},
		getImage: function(userInfo, imageId, callbackFunction){
			console.log("Returning mock specific image")
		},
		getRegions: function(userInfo, callbackFunction){
			var response = {
				"resp": undefined,
				"status" : undefined,
				"code" : undefined,
				"data" : ""
			}
			fs.readFile( __dirname + "/saps_files/regions.json", 'utf8', function (err, data) {
			   	if(err){
			   		console.log(err)
					response.status = "ERROR"
					response.code = 500;
					response.data = err
				}else{
					response.status = "SUCCESS"
					response.code = 200;
					response.data = JSON.parse(data)
				}
				callbackFunction(response);
			});
		},
		getRegionsDetails: function(userInfo, regionNames, callbackFunction){
			var response = {
				"resp": undefined,
				"status" : undefined,
				"code" : undefined,
				"data" : ""
			}
			fs.readFile( __dirname + "/mockFiles/regions_details.json", 'utf8', function (err, data) {
			   	if(err){
			   		console.log(err)
					response.status = "ERROR"
					response.code = 500;
					response.data = err
				}else{
					
					var responseData = [];
					var regionsDetails = JSON.parse(data)

					regionNames.forEach(function(regionName, index){

						for(count = 0; count < regionsDetails.length; count++){
							if(regionName == regionsDetails[count].regionName){
								responseData.push(regionsDetails[count]);
								break;
							}
						}

					});

					response.status = "SUCCESS"
					response.code = 200;
					response.data = responseData;
				}
				callbackFunction(response);
			});
		}
	};

	module.exports = api;
}

startApi();


