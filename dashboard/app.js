var express = require('express');
var path = require('path');
var fs = require("fs");
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var sebalApi;

var app = express();
var port = 8080;

var appConfig;
var sebalConfig;

var reqUserInfo = {
	"userEmail" : undefined,
	"userPass" : undefined,
	"authToken" : undefined
}

var tokenHeader = "x-auth-token";
var userEmailHeader = "useremail";
var userPassHeader = "userpass";
var credentialsHeader = "x-auth-credentials";

var logger;

var loadAppConfig = function(next){
	
	fs.readFile( __dirname + "/" + "dashboard.config", 'utf8', function (err, data) {
   		
   		appConfig = JSON.parse(data);

   		//Creating log
   		logger = (function() {

   			var logNumberLevel;
   			if(appConfig.logLevel == "DEBUG"){
   				logNumberLevel = 0;
   			}
   			else if(appConfig.logLevel == "INFO"){
   				logNumberLevel = 1;
   			}
   			else if(appConfig.logLevel == "WARNING"){
   				logNumberLevel = 2;
   			}
   			else{
   				logNumberLevel = 3;
   			}

			api={
				debug:function(text){
					if(logNumberLevel == 0){
						console.log("DEBUG: "+text);
					}
				},
				info:function(text){
					if(logNumberLevel <= 1){
						console.log("INFO: "+text);
					}
				},
				warning:function(text){
					if(logNumberLevel <= 2){
						console.log("WARNING: "+text);
					}
				},
				error: function(text){
					if(logNumberLevel <= 3){
						console.log("ERROR: "+text);
					}
				}
			}
			return api;
		})();

	   	next();
	});
	
}
var loadSebalConfig = function(next){
	fs.readFile( __dirname + "/" + "saps.config", 'utf8', function (err, data) {
   		sebalConfig = JSON.parse(data);
   		logger.info("Sebal config "+JSON.stringify(sebalConfig));
   		startApp();
	});
}


var startApp = function(){
	logger.debug("Start app")
	//Starting configurations
	if(appConfig.devMode){
		logger.warning("** ATENTION - STARTING APP IN DEV MODE **")
		sebalApi = require('./routes/sebalMockApi.js');
	}else{
		sebal = require('./routes/sebalApi.js');
		sebalApi = sebal.SebalApi(sebalConfig);
	}

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended:false}));

	app.use(express.static(path.join(__dirname, '/public'))); //Point to Angular frontend content


	app.listen(appConfig.port, function(err, res){
		if(err){
			logger.error("Error while starting server");
		}else{
			logger.info("Running at "+appConfig.port);		
		}
	});

	/**** API TO RETURN DATA TO FRONTEND ****/
	/*	
		- images
		- regions
	*/
	//Return list of images
	app.get("/images", extractUserInfo, function(req, res) {
		
		logger.debug("Getting images")
		var callbackFunction = registerCallBack(handleGetImagesResponse, req, res);
		sebalApi.getImages(reqUserInfo, callbackFunction);
		
	});
	app.get("/regions", extractUserInfo, function(req, res) {
		logger.debug("Getting regions")
		var callbackFunction = registerCallBack(handleGetRegionsResponse, req, res);
		sebalApi.getRegions(reqUserInfo, callbackFunction);
		
	});
	app.get("/regions/details", extractUserInfo, function(req, res) {
		var regionsNames = req.query.regionsNames.split(',');
		logger.debug("Getting regions details")
		var callbackFunction = registerCallBack(handleGetRegionsDetailsResponse, req, res);
		sebalApi.getRegionsDetails(reqUserInfo, regionsNames, callbackFunction);
		
	});


	//**** CALLBACK FUNCTIONS TO HANDLE SEBAL API RESPONSES ****//
	function registerCallBack(callBackfunction, httpReq, httpRes){
		return function(resonse){
			callBackfunction(resonse, httpReq, httpRes);
		}
	}

	//TODO create one handle for each API endpoint? Format response for FRONTEND
	function handleGetImagesResponse(resonse, httpReq, httpRes){
		//httpRes.setHeader("Access-Control-Allow-Origin", "*");
		httpRes.status(resonse.code);
		httpRes.end(JSON.stringify(resonse.data));
		
	}

	//TODO create one handle for each API endpoint? Format response for FRONTEND
	function handleGetRegionsResponse(resonse, httpReq, httpRes){
		//httpRes.setHeader("Access-Control-Allow-Origin", "*");
		//console.log("responding: "+resonse.data)
		var formattedData = [];
		resonse.data.forEach(function(item, index){

			var region ={
				"id": item.regionId,
				"name": item.regionName,
				"coordinates": []
			}
			for(var count=0; count < item.coordinates.length; count=count+2){
				region.coordinates.push([item.coordinates[count],item.coordinates[count+1]])
			}
			formattedData.push(region)
		})
		httpRes.status(resonse.code);
		httpRes.end(JSON.stringify(formattedData));
		
	}

	function handleGetRegionsDetailsResponse(resonse, httpReq, httpRes){
		//httpRes.setHeader("Access-Control-Allow-Origin", "*");
		//console.log("responding: "+resonse.data)
		var formattedData = [];
		resonse.data.forEach(function(item, index){
			//console.log("item: "+JSON.stringify(item));
			var regionDetail ={
				"name": "",
				"totalImgs": 0,
				"images": [],
				"totalSatellitesImgs": {}
			}
			//console.log("item.images: "+item.images)
			regionDetail.name = item.regionName;
			regionDetail.images = item.images;
			var totalImgs = 0;
			var satelliteTotal = {
				l4:{
					name:"L4",
					total:0
				},
				l5:{
					name:"L5",
					total:0
				},
				l7:{
					name:"L7",
					total:0
				}
			};

			regionDetail.images.forEach(function(image, index){

				totalImgs++;
				image.satellites.forEach(function(sat, index){
					//console.log(JSON.stringify(satelliteTotal[sat.name]))
					satelliteTotal[sat.name].total = satelliteTotal[sat.name].total+1;
				});
			});
			regionDetail.totalImgs = item.imgsProcessed;//TODO Change this for totalImgs
			regionDetail.totalSatellitesImgs = satelliteTotal;
			formattedData.push(regionDetail)
		})
		httpRes.status(resonse.code);
		httpRes.end(JSON.stringify(formattedData));
		
	}

	//HELPER FUNCTIONS
	function extractUserInfo(req, res, next){
	
		reqUserInfo.userEmail = req.headers[userEmailHeader];
		reqUserInfo.userPass = req.headers[userPassHeader];
		reqUserInfo.authToken = req.headers[tokenHeader];

		if(!reqUserInfo.userEmail ||
				!reqUserInfo.userPass){
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.status(400);
			res.end("User credentials not informed");
		}
		next();

	}
}

var startConfig = function(){

	loadAppConfig(loadSebalConfig)
}

startConfig();