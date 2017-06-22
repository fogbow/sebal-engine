var app = angular.module('schedulerDashboard', [
	'dashboardControllers',
	'dashboardServices',
	'ngRoute'
	//'ui.bootstrap'
]);
//Global Functions available on pages
app.run(function($rootScope) {
	console.log('Creating global functions')
	$rootScope.globalVar = "teste";
	$rootScope.switchVisibility = function(elementId) {
		var element = $("#"+elementId);
	    if(element.hasClass( "sb-hidden" )){
	    	element.removeClass("sb-hidden");
	    }else{
	    	element.addClass("sb-hidden");
	    }
	};
});
app.constant("appConfig", {
	"urlSebalSchedulerService":"http://localhost:9192/",
	"imagePath":"images",
	"regionPath":"regions",
	"getImageByIdPath":"images/:imageId",
	"LOGIN_SUCCEED":"login.succeed",
	"LOGIN_FAILED":"login.faild",
	"LOGOUT_SUCCEED":"logout.succed",
	"DEFAULT_SB_VERSION":"version-001",
	"DEFAULT_SB_TAG":"tag-001",
	"SATELLITE_OPTS":[
		{"label":"Landsat 5", "value":"landsat_5"},
		{"label":"Landsat 7", "value":"landsat_7"},
		{"label":"Landsat 8", "value":"landsat_8"}
	],
	"MODAL_OPENED":"modalOpened",
	"MODAL_CLOSED":"modalClosed",
	"heatMap":{
		transparency:0.5,
		colours:[
			{"label":"0","minValue":0,"maxValue":0,"r":255,"g":255,"b":178},
			{"label":"1 a 300","minValue":1,"maxValue":300,"r":254,"g":217,"b":118},
			{"label":"300 a 500","minValue":301,"maxValue":500,"r":254,"g":178,"b":76},
			{"label":"500 a 700","minValue":501,"maxValue":700,"r":253,"g":141,"b":60},
			{"label":"700 a 900","minValue":701,"maxValue":900,"r":240,"g":59,"b":32},
			{"label":"900+","minValue":901,"maxValue":undefined,"r":189,"g":0,"b":38},
		]
	}
});
app.config(function($logProvider){
  $logProvider.debugEnabled(true);
});
app.config(function($routeProvider){

	var checkUser = function($location, AuthenticationService){
		if(!AuthenticationService.getCheckUser()){
			$location.path("/");
		}
	}

	$routeProvider
	// route for the home page
	.when('/', {
	    templateUrl : '/pages/login.html',
	})
	.when('/new-user', {
	    templateUrl : '/pages/create_user.html',
	})
	.when('/monitor', {
		resolve: {
			"check": checkUser
		},
	    templateUrl : '/pages/monitor.html',
	})
	.when('/selectRegion', {
		resolve: {
			"check": checkUser
		},
	    templateUrl : '/pages/select_region.html',
	})
	.when('/help', {
		resolve: {
			"check": checkUser
		},
	    templateUrl : '/pages/help.html',
	})
	.when('/contact', {
		resolve: {
			"check": checkUser
		},
	    templateUrl : '/pages/contact.html',
	})
	.otherwise({
        redirectTo: '/'
     });
});

app.filter('offset', function() {
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
});

