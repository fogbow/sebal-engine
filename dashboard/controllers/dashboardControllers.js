var dashboardControllers = angular.module('dashboardControllers', []);

dashboardControllers.controller('MainController', function($scope, $rootScope, $log, $filter, $timeout, 
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
      //console.log("Activating "+$scope.actual);
      $("#"+idButton).addClass('span-button-selected');  
    }
    if($scope.previousButton !== undefined){
      //console.log("Deactivating "+$scope.previousButton);
      $("#"+$scope.previousButton).removeClass('span-button-selected');  
    }
  }
  $scope.reverseActivateButton = function(idButton){
    //console.log("Reversing "+idButton);
    $scope.actual = $scope.previousButton;
    $scope.previousButton = idButton;
    
    if($scope.previousButton !== undefined){
      $("#"+$scope.previousButton).addClass('span-button-selected');
    }
    if($scope.actual !== undefined){
      $("#"+$scope.actual).removeClass('span-button-selected');
    }
  }

  $scope.openCloseModal = function(modalId, show){
    if(show){
      $rootScope.$broadcast(appConfig.MODAL_OPENED);
      $('#'+modalId).modal('show')
    }else{
      $('#'+modalId).modal('hide')
      // $('#'modalId).on('hidden.bs.modal', function (e) {
      //     $rootScope.$broadcast(appConfig.MODAL_CLOSED);
      // })
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
    //console.log(value);
    //GlobalMsgService.pushMessageSuccess(value);
    getUserName();
  });

  //$scope.activateButton('monitorBtn');

});

dashboardControllers.controller('LoginController', function($scope, $rootScope, $log, $filter, $timeout,
  $location, appConfig, AuthenticationService, GlobalMsgService) {
  
  $scope.username ;
  $scope.password ;
  $scope.email ;
  $scope.errorMsg = undefined;
  $scope.create = true;
  $scope.msg = "Teste";
  
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
  $scope.loadCreateNewUser = function(){
    $location.path('/new-user');
  }
  $scope.createNewUser = function(){
    
    if($scope.password != $scope.passwordConfirm){
      $scope.errorMsg = "Senhas não conferem."
      return
    }

    AuthenticationService.createNewUser($scope.username, $scope.email, $scope.password, $scope.passwordConfirm,
      function(response){ //Success call back
        //$rootScope.$broadcast(appConfig.CREATE_USER_SUCCEED, "Create user succeed");
        console.log("User Created");
        $scope.msg = "Obrigado =)\nNo prazo de até 3 dias você receberá\num email com a resolução de seu cadastro"
        //$location.path('/monitor');
        $scope.create = false;
      }, 
      function(response){ //Erro call back
        //$rootScope.$broadcast(appConfig.CREATE_USER_FAIL, "Create user failed");
        console.log("Create user error: "+JSON.stringify(response));
        $scope.msg = response.msg;
        $scope.create = false;
      }
    );
  }

  $scope.clearLoginMsg = function(){
    $scope.errorMsg = undefined;
  }
 
});

dashboardControllers.controller('MonitorController', function($scope, $log, $filter, $timeout, $filter,
   ImageService, AuthenticationService, GlobalMsgService, appConfig) {
  
  $scope.sebalSubmissions = [];
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

  $scope.switchSubmitionDetail = function(submissionId){

    //console.log("Switching "+submissionId);

    $scope.sebalSubmissions.forEach(function(item, index){

      if(item.id == submissionId){
        //console.log("Found "+submissionId);
        item.showDetail = !item.showDetail;
      }
    })
  }

  function processImages(images){

    submissions = []

    submission = {
      id:"sb01",
      name:"Submission 01",
      showDetail: false,
      date:"2017-05-01",
      totalImages:0,
      totalDownloading:0,
      totalDownloaded:0,
      totalQueued:0,
      totalFeched:0,
      totalError:0,
      images:[]
    }
    images.forEach(function(item, index){
      
      submission.totalImages = submission.totalImages +1
      
      if(item.state === 'downloading'){
        submission.totalDownloading = submission.totalDownloading+1
      }
      if(item.state === 'downloaded'){
        submission.totalDownloaded = submission.totalDownloaded +1
      }
      if(item.state === 'queued'){
        submission.totalQueued = submission.totalQueued +1
      }
      if(item.state === 'fetched'){
        submission.totalFeched = submission.totalFeched +1
      }
      if(item.state === 'error'){
        submission.totalError = submission.totalError +1
      }

      //Converting string to date
      item.creationTime = new Date(item.creationTime)
      item.updateTime = new Date(item.updateTime)
      
      submission.images.push(item)
    })

    submissions.push(submission)
    return submissions
  }

  $scope.getSebalImages = function(){
    ImageService.getImages(
          function(data){
              $scope.sebalSubmissions = processImages(data);   
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
        "<dt>ID:</dt>"+
        "<dd>"+item.stationId+"</dd>"+
        "<dt>State:</dt>"+
        "<dd>"+item.state+"</dd>"+
        "<dt>Creation Time:</dt>"+
        "<dd>"+$filter('date')(item.creationTime, 'yyyy-MM-dd hh:mm:ss')+"</dd>"+
        "<dt>Update Time:</dt>"+
        "<dd>"+$filter('date')(item.updateTime, 'yyyy-MM-dd hh:mm:ss')+"</dd>"+
        "<dt>Version/Tag:</dt>"+
        "<dd><input type='text' readonly class='sb-width-lg' value='"+item.sebalVersion+"'/></dd>"+
        "<dt>Fmask Version</dt>"+
        "<dd><input type='text' readonly class='sb-width-lg' value='"+item.fmaskVersion+"'/></dd>"+
        "<dt>Download Link</dt>"+
        "<dd><input type='text' readonly class='sb-width-lg' value='"+item.downloadLink+"'/></dd>"+
        
        // "<dt>Federation Member</dt>"+
        // "<dd>"+item.federationMember+"</dd>"+
        // "<dt>Priority</dt>"+
        // "<dd>"+item.priority+"</dd>"+
        // "<dt>Sebal Tag</dt>"+
        // "<dd>"+item.sebalTag+"</dd>"+
        // "<dt>Crawler Version</dt>"+
        // "<dd>"+item.crawlerVersion+"</dd>"+
        // "<dt>Fetcher Version</dt>"+
        // "<dd>"+item.fetcherVersion+"</dd>"+
        // "<dt>Blowout Version</dt>"+
        // "<dd>"+item.blowoutVersion+"</dd>"+
        // "<dt>Status</dt>"+
        // "<dd>"+item.status+"</dd>"+
        // "<dt>Error</dt>"+
        // "<dd>"+item.error+"</dd>"+
      "</dl>"+
    "</div>";

    //console.log(elementId+" -- "+JSON.stringify(item));
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
  
  $scope.DEFAULT_VALUE = 'd';
  $scope.OTHER_VALUE = 'o';
  $scope.modalMsgError = undefined;
  $scope.satelliteOpts = appConfig.SATELLITE_OPTS;

  $scope.$on(appConfig.MODAL_OPENED, function (event, value) {
    $scope.cleanForm();
  });
  $scope.$on(appConfig.MODAL_CLOSED, function (event, value) {
    $scope.cleanForm();
  });

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

    // console.log("arrDate: "+JSON.stringify(arrDate))

    var d = parseInt(arrDate[0], 10),
        m = parseInt(arrDate[1], 10),
        y = parseInt(arrDate[2], 10);
    // console.log("Creating date: d"+d+" - m"+m+" - y"+y)
    return new Date(y, m - 1, d);
  }

  function msgRequiredShowHide(fieldId, show){

    requiredMsg = $('#'+fieldId).find('.sb-required')

    if (requiredMsg) {

      if(show){
        requiredMsg.removeClass('sb-hide');
      }else{
        requiredMsg.addClass('sb-hide');
      }
    }        
    
  }

  //Managing datepickers
  $(function () {
      $('.sebal-datapicker').datetimepicker({
          format: 'DD/MM/YYYY'
      });
  });

  $scope.cleanForm = function(){
      
      $scope.submissionName = undefined;
      $('#firstYear').val('')
      $('#lastYear').val('')
      $scope.region = undefined;
      $scope.sebalVersion = undefined;
      $scope.sebalTag = undefined;
      

      $('#radio-defaul-version').prop( "checked", 'checked' );
      $('#radio-other-version').prop( "checked", null );
      $('#radio-defaul-tag').prop( "checked", 'checked' );
      $('#radio-other-tag').prop( "checked", null );

      $scope.sebalVersionOpt = $scope.DEFAULT_VALUE
      $scope.sebalTagOpt = $scope.DEFAULT_VALUE

      $scope.satelliteOpts.forEach(function(item, index){
        $('#radioSatellite'+(index+1)).prop( "checked", null );
      });

      //Clean error msgs
      $scope.modalMsgError = undefined;
      msgRequiredShowHide('firstYearField', false);
      msgRequiredShowHide('lastYearField', false);
      msgRequiredShowHide('regionField',false);
      msgRequiredShowHide('versionField',false);
      msgRequiredShowHide('tagField',false);
      msgRequiredShowHide('satelliteField',false);
      // $('#radioSatellite1').prop( "checked", null );
      // $('#radioSatellite2').prop( "checked", null );
      // $('#radioSatellite3').prop( "checked", null );

  }

  
  $scope.submitJob = function(){

    hasError = false;
    $scope.modalMsgError = undefined;

    if(!validateDate($('#firstYear').val())){
      hasError = true
      msgRequiredShowHide('firstYearField',true);
    }else{
      $scope.firstYear = parseDate($('#firstYear').val())
      msgRequiredShowHide('firstYearField', false);
    }

    if(!validateDate($('#lastYear').val())){
      hasError = true
      msgRequiredShowHide('lastYearField',true);
    }else{
      $scope.lastYear = parseDate($('#lastYear').val())
      msgRequiredShowHide('lastYearField', false);
    }

    if($scope.firstYear > $scope.lastYear){
      console.log("Last year date must be greater than first year date")
      $scope.modalMsgError = "Last year date must be greater than first year date";
      hasError = true
    }

    if (!$scope.region || $scope.region.length == 0){
      hasError = true
      msgRequiredShowHide('regionField',true);
    }else{
      msgRequiredShowHide('regionField',false);
    }

    if($scope.sebalVersionOpt === $scope.DEFAULT_VALUE){
      $scope.sebalVersion = appConfig.DEFAULT_SB_VERSION;
      msgRequiredShowHide('versionField',false);
    }else if (!$scope.sebalVersion || $scope.sebalVersion.length == 0){
      hasError = true
      msgRequiredShowHide('versionField',true);
    }

    if($scope.sebalTagOpt === $scope.DEFAULT_VALUE){
      $scope.sebalTag = appConfig.DEFAULT_SB_TAG;
      msgRequiredShowHide('tagField',false);
    }else if (!$scope.sebalTag || $scope.sebalTag.length == 0){
      hasError = true
      msgRequiredShowHide('tagField',true);
    }

    $scope.satelliteOpts.forEach(function(item, index){

      var radioId = '#radioSatellite'+(index+1)
          
      if($(radioId).prop('checked')){
        $scope.satellite = $(radioId).prop('value');
      }
        // console.log(radioId+' Value: '+$(radioId).prop('value'))
        // console.log(radioId+' Checked: '+$(radioId).prop('checked'))
    });

    console.log('$scope.satellite: '+$scope.satellite)
    if(!$scope.satellite){
      hasError = true
      msgRequiredShowHide('satelliteField',true);
    }else{
      msgRequiredShowHide('satelliteField',false);
    }

    if(hasError){
      return
    }

    var data = {
      'imageName': $scope.submissionName,
      'firstYear': $scope.firstYear,
      'lastYear': $scope.lastYear,
      'region': $scope.region, 
      'sebalVersion': $scope.sebalVersion, 
      'sebalTag': $scope.sebalTag,
      'dataSet' : $scope.satellite
    }

    console.log("Sending "+JSON.stringify(data));
    
    JobService.postJob(data,
      function(response){
        GlobalMsgService.pushMessageSuccess('Your job was submitted. Wait for the processing be completed. ' 
              + 'If you activated the notifications you will get an email when finished.');
        
        $scope.openCloseModal('submissionsModal', false);
      }, 
      function(error){
        $log.error(JSON.stringify(error));
        $scope.modalMsgError = 'Error while trying to submit a job.';
        //$scope.cleanForm();
      });
  };
  
 
});

dashboardControllers.controller('MapController', function($scope, $log, $filter, $http, $timeout, 
  AuthenticationService, RegionService, GlobalMsgService, appConfig) {

  //$scope.user = AuthenticationService.getUser();
  var sapsMap = initiateMap("map", callbackSelectionInfo, updateVisibleRegions);
  var labels = [
    {"label":"0","color":"rgb(255,255,255)"}
  ]

  function callbackSelectionInfo(selectionInfo){
    $scope.message = 'Selection: '+JSON.stringify(selectionInfo);
    $scope.$apply(); //This is for apply the modification avbove, that is made by callback.
    if(selectionInfo.quaresSelected > 4) {
      alert('Invalid selection!! You can\'t select more than 4 regions on the grid.');
    }else{
      alert('Selection at :'+JSON.stringify(selectionInfo));
    }

  };

  var regions;

  function updateVisibleRegions(){
    var visibleReqions = sapsMap.getVisibleRegions();
    visibleReqions.forEach(function(visibleRegion, vindex){
      
      for(count = 0; count < regions.length; count++){

        if(visibleRegion == regions[count].regionName){
            sapsMap.updateRegionProcImg(visibleRegion, regions[count].imgsProcessed)
            break;
        }
      
      } 
    })
  }

  function loadRegions(){
        $http.get('../saps_files/regions.json')
        .success(function(response){
            //console.log('Regions loaded from map: '+JSON.stringify(response));
            sapsMap.generateGrid(response);
            regions = response;
            updateVisibleRegions();

        })
        .error(function(error){
            console.log('Error while trying to ge regions: '+error)
        })
  }


  loadRegions();
  // RegionService.getRegions(
  //         function(data){ 
  //             initiateMap("map", data, callbackSelectionInfo);
  //         },
  //         function(error){
  //             var msg = "An error occurred when tried to get Regions";
  //             $log.error(msg+" : "+error);
  //             GlobalMsgService.pushMessageFail(msg)
  //         }
  // ); 
  
  $scope.zoomIn = function(){
    sapsMap.zoomIn()
  }
  $scope.zoomOut = function(){
    sapsMap.zoomOut()
  }
});



dashboardControllers.controller("PaginationController", function($scope, $log) {

  $scope.itemsPerPage = 9999;
  $scope.itemsPerPageOptions = [5, 8, 10, 20, 50];
  $scope.currentPage = 0;
  $scope.totalPage = 0;
  $scope.prevPageDisabled = true;
  $scope.nextPageDisabled = true;
  $scope.filterValue = {};

  $scope.filterTable = function (submissionId) {
     
      $log.debug("Filtering table for "+JSON.stringify($scope.filterValue)+' on .searchable-'+submissionId+' tr');
      
      value = $scope.filterValue[submissionId]

      $log.debug('Specific: '+value);
      $log.debug('All: '+value);
      var rex = new RegExp(value, 'i');

      $('.'+submissionId+' tr').hide();
      $('.'+submissionId+' tr').filter(function () {
          //$log.debug("Testing "+$(this).text());
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