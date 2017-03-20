var dashboardControllers = angular.module('dashboardControllers', []);

dashboardControllers.controller('MainController', function($scope, $log, $filter, $timeout, 
   $location, AuthenticationService, GlobalMsgService, appConfig) {
  
  $scope.user = {name:"", token: ""};
  $scope.globalMsg = GlobalMsgService;
  getUserName();
  $scope.previousButton = undefined;
  $scope.actual = undefined;

  $scope.activateButton = function(idButton){
    
    $scope.previousButton = $scope.actual;
    $scope.actual = idButton;

    if($scope.actual !== undefined){
      console.log("Activating "+$scope.actual);
      $("#"+idButton).addClass('span-button-selected');  
    }
    if($scope.previousButton !== undefined){
      console.log("Deactivating "+$scope.previousButton);
      $("#"+$scope.previousButton).removeClass('span-button-selected');  
    }
  }
  $scope.reverseActivateButton = function(idButton){
    console.log("Reversing "+idButton);
    $scope.actual = $scope.previousButton;
    $scope.previousButton = idButton;
    
    if($scope.previousButton !== undefined){
      $("#"+$scope.previousButton).addClass('span-button-selected');
    }
    if($scope.actual !== undefined){
      $("#"+$scope.actual).removeClass('span-button-selected');
    }
  }

  $scope.doLogout = function(){
    console.log("Logout success");
    AuthenticationService.doLogout();
    $location.path('/');
  }

  $scope.clearGlobalMsg = function(){
    GlobalMsgService.cleanMsg();
  }
 
  function getUserName(){
    $scope.user.name = AuthenticationService.getUserName();
  }

  $scope.$on(appConfig.LOGIN_SUCCEED, function (event, value) {
    console.log(value);
    //GlobalMsgService.pushMessageSuccess(value);
    getUserName();
  });

  //$scope.activateButton('monitorBtn');

});

dashboardControllers.controller('LoginController', function($scope, $rootScope, $log, $filter, $timeout,
  $location, appConfig, AuthenticationService, GlobalMsgService) {
  
  $scope.username ;
  $scope.password ;
  $scope.errorMsg = undefined;
  
  $scope.doLogin = function(){
    $scope.errorMsg = undefined;
    AuthenticationService.basicSessionLogin($scope.username, $scope.password,
      function(response){ //Success call back
        $rootScope.$broadcast(appConfig.LOGIN_SUCCEED, "Login succeed");
        $location.path('/monitor');
      }, 
      function(response){ //Erro call back
        console.log("Login error: "+JSON.stringify(response));
        $scope.errorMsg = response.msg;
      }
    );
  }

  $scope.clearLoginMsg = function(){
    $scope.errorMsg = undefined;
  }
 
});

dashboardControllers.controller('MonitorController', function($scope, $log, $filter, $timeout, 
   ImageService, AuthenticationService, GlobalMsgService, appConfig) {
  
  $scope.sebalImages = [];
  $scope.elementShowingDetail = undefined;

  $scope.detail={
    downloadLink:"",
    state:"",
    federationMember:"",
    priority:"",
    stationId:"",
    sebalVersion:"",
    sebalTag:"",
    crawlerVersion:"",
    fetcherVersion:"",
    blowoutVersion:"",
    fmaskVersion:"",
    creationTime:"",
    updateTime:"",
    status:"",
    error:""
  }

  $scope.getSebalImages = function(){
    ImageService.getImages(
          function(data){
              $scope.sebalImages = data;   
          },
          function(error){
              var msg = "An error occurred when tried to get Images";
              $log.error(msg+" : "+error);
              GlobalMsgService.pushMessageFail(msg)
          }
    ); 
  }
  $scope.showDetail = function(elementId, item){

    var detailContent = 
    "<div class='col-md-12'>"+
      "<dl class='dl-horizontal'>"+
        "<dt>Download Link</dt>"+
        "<dd>"+item.downloadLink+"</dd>"+
        "<dt>State</dt>"+
        "<dd>"+item.state+"</dd>"+
        "<dt>Federation Member</dt>"+
        "<dd>"+item.federationMember+"</dd>"+
        "<dt>Priority</dt>"+
        "<dd>"+item.priority+"</dd>"+
        "<dt>Station ID</dt>"+
        "<dd>"+item.stationId+"</dd>"+
        "<dt>Sebal Version</dt>"+
        "<dd>"+item.sebalVersion+"</dd>"+
        "<dt>Sebal Tag</dt>"+
        "<dd>"+item.sebalTag+"</dd>"+
        "<dt>Crawler Version</dt>"+
        "<dd>"+item.crawlerVersion+"</dd>"+
        "<dt>Fetcher Version</dt>"+
        "<dd>"+item.fetcherVersion+"</dd>"+
        "<dt>Blowout Version</dt>"+
        "<dd>"+item.blowoutVersion+"</dd>"+
        "<dt>Fmask Version</dt>"+
        "<dd>"+item.fmaskVersion+"</dd>"+
        "<dt>Creation Time</dt>"+
        "<dd>"+item.creationTime+"</dd>"+
        "<dt>Update Time</dt>"+
        "<dd>"+item.updateTime+"</dd>"+
        "<dt>Status</dt>"+
        "<dd>"+item.status+"</dd>"+
        "<dt>Error</dt>"+
        "<dd>"+item.error+"</dd>"+
      "</dl>"+
    "</div>";

    console.log(elementId+" -- "+JSON.stringify(item));
    if($scope.elementShowingDetail !== undefined ||
        $scope.elementShowingDetail === elementId){
      $("#"+elementId).empty();
      $("#"+elementId).addClass('hidden');
      $scope.elementShowingDetail = undefined;

    }else{
      

      $("#"+elementId).append(detailContent);
      $("#"+elementId).removeClass('hidden');
      $scope.elementShowingDetail = elementId;
    }
  }

  $scope.getSebalImages();
 
});


dashboardControllers.controller('JobController', function($scope, $log, $filter, $timeout, 
  AuthenticationService, JobService, GlobalMsgService, appConfig) {
  
  function validateDate(date){

    re = /^[0-3]?[0-9]\/[01]?[0-9]\/[12][90][0-9][0-9]$/

    if(date == '' || !date.match(re)) {
      console.log('Invalid date');
      return false;
    }
    console.log('Valid date');
    return true;
  }
  
  function parseDate(date) {
    var arrDate = date.split("/");
    var d = parseInt(arrDate[0], 10),
        m = parseInt(arrDate[1], 10),
        y = parseInt(arrDate[2], 10);
    return new Date(y, m - 1, d);
  }

  //Managing datepickers
  $(function () {
      $('.sebal-datapicker').datetimepicker({
          format: 'DD/MM/YYYY'
      });
  });

  $scope.cleanForm = function(){
      $scope.firstYear = undefined;
      $scope.lastYear = undefined;
      $scope.region = undefined;
      $scope.sebalVersion = undefined;
      $scope.sebalTag = undefined;
  }

  $scope.submitJob = function(){
    
    if(!validateDate($('#firstYearField').val())){
      GlobalMsgService.pushMessageFail('First Year date invalid.');
      return;
    }else{
      $scope.firstYear = parseDate($('#firstYearField').val())
    }
    if(!validateDate($('#secondYearField').val())){
      GlobalMsgService.pushMessageFail('Last Year date invalid');
      return;
    }else{
      $scope.firstYear = parseDate($('#secondYearField').val())
    }
    
    $scope.firstYear = $('#firstYearField').val();
    $scope.firstYear = $('#secondYearField').val();

    var data = {
      'firstYear': $scope.firstYear, 
      'lastYear': $scope.lastYear, 
      'region': $scope.region, 
      'sebalVersion': $scope.sebalVersion, 
      'sebalTag': $scope.sebalTag
    }

    console.log("Sending "+JSON.stringify(data));
    
    JobService.postJob(data,
      function(response){
        GlobalMsgService.pushMessageSuccess('Your job was submitted. Wait for the processing be completed. ' 
              + 'If you activated the notifications you will get an email when finished.');
        $scope.cleanForm();
      }, 
      function(error){
        $log.error(JSON.stringify(error));
        GlobalMsgService.pushMessageFail('Error while trying to submit a job.');
        //$scope.cleanForm();
      });
  };
  
 
});

dashboardControllers.controller('MapController', function($scope, $log, $filter, $timeout, 
  AuthenticationService, RegionService, GlobalMsgService, appConfig) {

  //$scope.user = AuthenticationService.getUser();

  function callbackSelectionInfo(selectionInfo){
    $scope.message = 'Selection: '+JSON.stringify(selectionInfo);
    $scope.$apply(); //This is for apply the modification avbove, that is made by callback.
    if(selectionInfo.quaresSelected > 4) {
      alert('Invalid selection!! You can\'t select more than 4 regions on the grid.');
    }else{
      alert('Selection at :'+JSON.stringify(selectionInfo));
    }
    

  };

  initiateMap("map", callbackSelectionInfo);

 
});



dashboardControllers.controller("PaginationController", function($scope, $log) {

  $scope.itemsPerPage = 9999;
  $scope.itemsPerPageOptions = [5, 8, 10, 20, 50];
  $scope.currentPage = 0;
  $scope.totalPage = 0;
  $scope.prevPageDisabled = true;
  $scope.nextPageDisabled = true;
  $scope.filterValue;

  $scope.filterTable = function () {
      $log.debug("Filtering table for "+$scope.filterValue);
      
      var rex = new RegExp($scope.filterValue, 'i');

      $('.searchable tr').hide();
      $('.searchable tr').filter(function () {
          $log.debug("Testing "+JSON.stringify($(this)));
          $log.debug("Testing "+$(this).text());
          var filterResult = rex.test($(this).text());
          return filterResult;
      }).show();


  };
  
  $scope.pageCount = function(arrayElements) {
    if( Array.isArray(arrayElements)){
      //$scope.totalPage = Math.ceil(arrayElements.length/$scope.itemsPerPage)-1;
      $scope.totalPage = 0;
    }else{
      $scope.totalPage = 0;
    }
    return $scope.totalPage;
  };

  $scope.getPages = function() {
    var pages = [];
    var range = $scope.totalPage;
    for (var i = 0; i < range; i++) {
      pages.push(i+1);
    };
    prevPageCheck();
    nextPageCheck();
    return pages;
  };

  $scope.setPage = function(n) {
    $scope.currentPage = n;
    $('#filter').val('Search in table...');
    prevPageCheck();
    nextPageCheck();
  };

  $scope.prevPage = function() {
    if ($scope.currentPage > 0) {
      $scope.currentPage--;
    }
    prevPageCheck();
    $('#filter').val('Search in table...');
  };

  $scope.nextPage = function() {
    if( Array.isArray(arrayElements)){
      if ($scope.currentPage < $scope.totalPage) {
        $scope.currentPage++;
      }
      nextPageCheck();
      $('#filter').val('Search in table...');
    }
  };

  $scope.selectItensPerPage = function(n){
    $scope.itemsPerPage = n;
  };

  function prevPageCheck(){
    if($scope.currentPage == 0){
        $scope.prevPageDisabled = true;
    }else{
        $scope.prevPageDisabled = false;
    }
  }

  function nextPageCheck(){
    if($scope.currentPage == $scope.totalPage){
        $scope.nextPageDisabled = true;
    }else{
        $scope.nextPageDisabled = false;
    }
  }
  

});