var app = angular.module('schedulerDashboard', [
	'dashboardControllers',
	'dashboardServices',
	'ngRoute'
	//'ui.bootstrap'
]);
app.constant("appConfig", {
	"urlSebalSchedulerService":"http://localhost:9192/",
	"imagePath":"images",
	"getImageByIdPath":"images/:imageId",
	"regionResourcePath":"regions/",
	"LOGIN_SUCCEED":"login.succeed",
	"LOGIN_FAILED":"login.faild",
	"LOGOUT_SUCCEED":"logout.succed"
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

