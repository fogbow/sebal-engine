var express = require('express');
var path = require('path');
var fs = require("fs");
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var sebalApi;

var app = express();
var port = 8080;

var appConfig;

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

var loadAppConfig = function(){
	
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
		sebalApi = sebal.SebalApi(appConfig.saps);
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
	app.get("/regions/search", extractUserInfo, function(req, res) {
		var regionsNames = req.query.regionsNames.split(',');
		logger.debug("Getting regions details")
		var callbackFunction = registerCallBack(handleGetRegionsDetailsResponse, req, res);
		sebalApi.getRegionsDetails(reqUserInfo, regionsNames, callbackFunction);
		
	});
	app.post("/email", extractUserInfo, function(req, res) {
		var data = req.body.data;
		logger.debug("Sending email: "+JSON.stringify(data))
		var callbackFunction = registerCallBack(handleSendEmailResponse, req, res);
		sebalApi.sendEmail(reqUserInfo, data, callbackFunction);
		
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
	function handleGetRegionsResponse(resonseRegions, httpReq, httpRes){
		
		var regionsNames = [];

		resonseRegions.data.forEach(function(item, index){
			regionsNames.push(item.regionName);
		})

		sebalApi.getRegionsDetails(reqUserInfo, regionsNames, function(regionDetailsResponse){
			
			regionDetailsResponse.data.forEach(function(regionDetail, index){

				var l4 = {name:"L4", total:0};
				var l5 = {name:"L5", total:0};
				var l7 = {name:"L7", total:0};
				totalImgBySatelitte = [];

				regionDetail.processedImages.forEach(function(processedImage, ind){
					processedImage.outputs.forEach(function(output, i){
						if(output.satelliteName === l4.name){
							l4.total = l4.total+1;
						}else if(output.satelliteName === l5.name){
							l5.total = l5.total+1;
						}else if(output.satelliteName === l7.name){
							l7.total = l7.total+1;
						}
					})
					
				});
				totalImgBySatelitte.push(l4);
				totalImgBySatelitte.push(l5);
				totalImgBySatelitte.push(l7);
				
				regionDetail.totalImgBySatelitte = totalImgBySatelitte;
				
				resonseRegions.data.forEach(function(region, index){
					if(regionDetail.regionName == region.regionName){
						region.regionDetail = regionDetail;
					}
				})
			})
			//console.log("responding: "+JSON.stringify(resonseRegions.data))
			httpRes.status(resonseRegions.code);
			httpRes.end(JSON.stringify(resonseRegions.data));
		});

		
		
	}

	function handleGetRegionsDetailsResponse(resonse, httpReq, httpRes){
		//httpRes.setHeader("Access-Control-Allow-Origin", "*");
		//console.log("responding: "+resonse.data)
		
		resonse.data.forEach(function(regionDetail, index){
			
			var l4 = {name:"L4", total:0};
			var l5 = {name:"L5", total:0};
			var l7 = {name:"L7", total:0};
			totalImgBySatelitte = [];

			regionDetail.processedImages.forEach(function(processedImage, ind){
				processedImage.outputs.forEach(function(output, i){
					if(output.satelliteName === l4.name){
						l4.total = l4.total+1;
					}else if(output.satelliteName === l5.name){
						l5.total = l5.total+1;
					}else if(output.satelliteName === l7.name){
						l7.total = l7.total+1;
					}
				})
				
			});
			totalImgBySatelitte.push(l4);
			totalImgBySatelitte.push(l5);
			totalImgBySatelitte.push(l7);
			
			regionDetail.totalImgBySatelitte = totalImgBySatelitte;

		})
		httpRes.status(resonse.code);
		httpRes.end(JSON.stringify(resonse.data));
		
	}

	function handleSendEmailResponse(resonse, httpReq, httpRes){
		//httpRes.setHeader("Access-Control-Allow-Origin", "*");
		console.log("POST EMAIL - responding: "+resonse.data)
		httpRes.status(resonse.code);
		httpRes.end(JSON.stringify(resonse.data));
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

loadAppConfig();