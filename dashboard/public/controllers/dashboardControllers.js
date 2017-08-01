var dashboardControllers = angular.module('dashboardControllers', []);

dashboardControllers.controller('MainController', function($scope, $rootScope, $log, $filter, $timeout, 
   $location, AuthenticationService, GlobalMsgService, appConfig) {
  
  $scope.user = {name:"", token: ""};
  $scope.globalMsg = GlobalMsgService;
  $scope.previousButton = undefined;
  $scope.actual = undefined;

  getUserName();

  function getLangCookie(userName){
    var cookies = document.cookie;
    var prefix = "user-"+userName+"-lang=";
    var begin = cookies.indexOf("; " + prefix);
    if (begin == -1) {
        begin = cookies.indexOf(prefix);
        if (begin != 0) {
            return null;
        }

    } else {
        begin += 2;
    }

    var end = cookies.indexOf(";", begin);
    if (end == -1) {
        end = cookies.length;                        
    }
    return unescape(cookies.substring(begin + prefix.length, end));
  }

  $scope.loadLanguagebyName = function(langOpt) {
    
    var lang = langLoader.getLangByName(langOpt.langName);
    if(lang !== undefined){
      $rootScope.languageContent = lang.content;
      $rootScope.languageChosen = langOpt;
      document.cookie="user-"+$scope.user.name+"-lang="+langOpt.langName;
      //$rootScope.$apply();
    }
    
  };

  $scope.loadLanguagebyShortName = function(langOpt) {
    
    var lang = langLoader.getLangByShortName(langOpt.langShortName);
    if(lang !== undefined){
      //console.log("New lang: "+JSON.stringify(lang.langName))
      $rootScope.languageContent = lang.content;
      $rootScope.languageChosen = langOpt;
      document.cookie="user-"+$scope.user.name+"-lang="+langOpt.langName;
      //$rootScope.$apply();
    }
    
  };

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

  $rootScope.showModalSuccess = function(msg){
    $scope.modalMsgSuccess = msg;
    $scope.openCloseModal('global-sucess-modal', true);
  }

  $scope.openCloseModal = function(modalId, show){
    if(show){
      console.log('Opening modal')
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

  var cookieLang = getLangCookie($scope.user.name);
  if(cookieLang){
    console.log("Loadign lang: "+cookieLang);
    $scope.loadLanguagebyName(cookieLang);
  }
  
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
        $location.path('/regions-map');
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

dashboardControllers.controller('ListSubmissionsController', function($scope, $log, $filter, $timeout, $filter,
   SubmissionService, AuthenticationService, GlobalMsgService, appConfig) {
  
  $scope.sapsSubmissions = [];
  $scope.allSubmissionsChecked = false;
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

    $scope.sapsSubmissions.forEach(function(item, index){

      if(item.id == submissionId){
        //console.log("Found "+submissionId);
        item.showDetail = !item.showDetail;
      }
    })
  }

  function processImages(images){

    submissions = []

    submission1 = {
      id:"sb01",
      name:"Submission 01",
      tags:["tag1","tag2","tag3"],
      showDetail: false,
      date:"2017-05-01",
      totalImages:0,
      totalDownloading:0,
      totalDownloaded:0,
      totalQueued:0,
      totalFeched:0,
      totalError:0,
      images:[],
      allChecked:false
    }

    submission2 = {
      id:"sb02",
      name:"Submission 02",
      tags:[],
      showDetail: false,
      date:"2017-05-27",
      totalImages:0,
      totalDownloading:0,
      totalDownloaded:0,
      totalQueued:0,
      totalFeched:0,
      totalError:0,
      images:[],
      allChecked:false
    }

    images.forEach(function(item, index){

      var submission;
      if(index % 2 == 0){
        submission = submission1;
      }else{
        submission = submission2;
      }
      
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
      item.checked = false;
      
      submission.images.push(item)

    })

    submissions.push(submission1);
    submissions.push(submission2);
    return submissions
  }

  $scope.generateTagsComponent = function(submission){
    
    if(submission.tagListComponent == undefined){
      console.log('Gerando tags para: '+submission.id)
      //Creating tag component
      var jnlitemListConfg = {
        target:submission.id+'-tags-div',
        items:submission.tags,
        options:{
          editButton:undefined,
          permanentInput:false,
        },
      }

      var tagList = lnil.NLItemsList(jnlitemListConfg);
      submission.tagListComponent = tagList;
      submission.tagListComponent.on('listchange',function(newList){
        $scope.$apply(function(){
          submission.tags = submission.tagListComponent.getValues();
        })
      });
      
    }
    
  }

  $scope.checkAllImages = function(){
    $scope.sapsSubmissions.forEach(function(submission, index){
      submission.allChecked = $scope.allSubmissionsChecked;
      $scope.checkUncheckAllBySubId(submission.id)
    });
  }

  $scope.checkUncheckAllBySubId = function(submissionId){
    
    for(var index = 0; index < $scope.sapsSubmissions.length; index++){
      if($scope.sapsSubmissions[index].id == submissionId){
        //$scope.sapsSubmissions[index].allChecked = !$scope.sapsSubmissions[index].allChecked;
        $scope.sapsSubmissions[index].images.forEach(function(image,ind){
          image.checked = $scope.sapsSubmissions[index].allChecked;
        });
        break;
      }
    }
  }
  $scope.checkUncheckImageByName = function(submissionId, checked){
    console.log("Checking for "+submissionId+" ...")
    for(var index = 0; index < $scope.sapsSubmissions.length; index++){
      if($scope.sapsSubmissions[index].id == submissionId){
        if(!checked){
          $scope.sapsSubmissions[index].allChecked = false;
        }else{
          var allChecked = true;
          $scope.sapsSubmissions[index].images.forEach(function(image,ind){
            if(!image.checked){
              allChecked = false;
            }
          });
          $scope.sapsSubmissions[index].allChecked = allChecked;
        }
        break;
      }
    }
  }
  // sub-{{ss.name}}-check-{{i.name}}

  $scope.getSapsSubmissions = function(){
    SubmissionService.getSubmissions(
          function(data){
              $scope.sapsSubmissions = processImages(data);   
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
      "<table class='sb-sub-detail-table'>"+
        "<tr>"+
          "<td class='title-col'>ID:</td>"+
          "<td>"+item.stationId+"</td>"+
        "</tr>"+
        "<tr>"+
          "<td class='title-col'>State:</td>"+
          "<td>"+item.state+"</td>"+
        "</tr>"+
        "<tr>"+
          "<td class='title-col'>Creation Time:</td>"+
          "<td>"+$filter('date')(item.creationTime, 'yyyy-MM-dd hh:mm:ss')+"</td>"+
        "</tr>"+
        "<tr>"+
          "<td class='title-col'>Update Time:</td>"+
          "<td>"+$filter('date')(item.updateTime, 'yyyy-MM-dd hh:mm:ss')+"</td>"+
        "</tr>"+
        "<tr>"+
          "<td class='title-col'>Version/Tag:</td>"+
          "<td><input type='text' readonly class='sb-width-lg' value='"+item.sebalVersion+"'/></td>"+
        "</tr>"+
        "<tr>"+
          "<td class='title-col'>Fmask Version</td>"+
          "<td><input type='text' readonly class='sb-width-lg' value='"+item.fmaskVersion+"'/></td>"+
        "</tr>"+
        "<tr>"+
          "<td class='title-col'>Download Link</td>"+
          "<td><input type='text' readonly class='sb-width-lg' value='"+item.downloadLink+"'/></td>"+
        "</tr>"+
      "</table>"+
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

  $scope.getSapsSubmissions();
 
});

dashboardControllers.controller('NewSubmissionsController', function($scope, $rootScope, $log, $filter, 
  $timeout, AuthenticationService, SubmissionService, GlobalMsgService, appConfig) {
  
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
      $('.saps-datepicker').datetimepicker({
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

      $scope.sapsVersionOpt = $scope.DEFAULT_VALUE
      $scope.sapsTagOpt = $scope.DEFAULT_VALUE

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

  
  $scope.newSubmission = function(){

    hasError = false;
    $scope.modalMsgError = undefined;

    if(!$rootScope.validateDate($('#firstYear').val())){
      hasError = true
      msgRequiredShowHide('firstYearField',true);
    }else{
      $scope.firstYear = $rootScope.parseDate($('#firstYear').val())
      msgRequiredShowHide('firstYearField', false);
    }

    if(!$rootScope.validateDate($('#lastYear').val())){
      hasError = true
      msgRequiredShowHide('lastYearField',true);
    }else{
      $scope.lastYear = $rootScope.parseDate($('#lastYear').val())
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
    
    SubmissionService.postSubmission(data,
      function(response){
        // GlobalMsgService.pushMessageSuccess('Your job was submitted. Wait for the processing be completed. ' 
        //       + 'If you activated the notifications you will get an email when finished.');
        
        $scope.openCloseModal('submissionsModal', false);
        $rootScope.showModalSuccess('Your job was submitted. Wait for the processing be completed. ' 
              + 'If you activated the notifications you will get an email when finished.');
      }, 
      function(error){
        $log.error(JSON.stringify(error));
        $scope.modalMsgError = 'Error while trying to submit a job.';
        //$scope.cleanForm();
      });
  };
  
 
});

dashboardControllers.controller('RegionController', function($scope, $rootScope,
  $log, $filter, $http, $timeout, AuthenticationService, RegionService, 
  GlobalMsgService, appConfig) {

  //Region detail example
  /*
  *regionDetail: 
  {  
   "name":"region16",
   "totalImgs":400,
   "images":[  
      {  
         "name":"img_01",
         "date":"2012-04-05",
         "satellites":[  
            {  
               "name":"l5",
               "link":"http://localhost:9080/images/img01"
            }
         ]
      }
   ],
   "totalSatellitesImgs":{  
      "l4":{  
         "name":"L4",
         "total":0
      },
      "l5":{  
         "name":"L5",
         "total":1
      },
      "l7":{  
         "name":"L7",
         "total":0
      }
   },
   "color":[  
      254,
      178,
      76,
      0.5
   ],
   "cssColor":"rgb(254,178,76)",
   "checked":false
  */ 
   
  var selectedRegion;
  var searchedRegions = [];

  $scope.satelliteOpts = appConfig.SATELLITE_OPTS;
  $scope.DEFAULT_VALUE = 'd';
  $scope.OTHER_VALUE = 'o';
  // Filters
  $scope.searchFilters = {
    generalSearch:'',
    regionFilter:'',
    sapsVersionOptFilter:$scope.DEFAULT_VALUE,
    sapsVersionFilter:'',
    sapsTagOptFilter:$scope.DEFAULT_VALUE,
    sapsTagFilter:'',
    satellite:''
  };

  $('#rad-filter-defaul-ver').prop( "checked", 'checked' );
  $('#rad-filter-other-ver').prop( "checked", null );
  $('#rad-filter-defaul-tag').prop( "checked", 'checked' );
  $('#rad-filter-other-tag').prop( "checked", null );
  // $scope.cleanSearch();
  // $scope.
  // $scope.
  // $scope.
  $scope.regionsDetails = [];
  $scope.allDetailsChecked = false;

  $(function () {
      $('.saps-datepicker').datetimepicker({
          format: 'DD/MM/YYYY'
      });
  });

  var sapsMap = initiateMap("map");

  function callbackBoxSelectionInfo(selectionInfo){
    $scope.message = 'Selection: '+JSON.stringify(selectionInfo);
    $scope.$apply(); //This is for apply the modification avbove, that is made by callback.
    if(selectionInfo.quaresSelected > 4) {
      alert('Invalid selection!! You can\'t select more than 4 regions on the grid.');
    }else{
      alert('Selection at :'+JSON.stringify(selectionInfo));
    }

  };

  function updateVisibleRegions(){
    
    var visibleReqions = sapsMap.getVisibleUnloadedRegions();
    if(visibleReqions.length > 0){
      RegionService.getRegionsDetails(visibleReqions, 
      function(data){

        data.forEach(function(regionDetail ,index){

          var transparency = $rootScope.heatMap.transparency;

          for(var index = 0; index < $rootScope.heatMap.colours.length; index++){

            var item = $rootScope.heatMap.colours[index];

            if( (item.minValue == undefined && regionDetail.totalImgs <= item.maxValue) ||
                (item.maxValue == undefined && regionDetail.totalImgs >= item.minValue) ||
                (regionDetail.totalImgs >= item.minValue && regionDetail.totalImgs <= item.maxValue) ){
              
              regionDetail.color = [item.r, item.g, item.b, transparency];
              regionDetail.cssColor = "rgb("+item.r+","+item.g+","+item.b+")"
              break;
            }

          };
          sapsMap.updateRegionDetail(regionDetail);
        });
      },
      function(error){
        GlobalMsgService.pushMessageFail("Erro while trying to load regions' information: "+error)
      });
    }
    
  }

  function loadRegions(){

      RegionService.getRegions(
        function(response){
          sapsMap.generateGrid(response);
          updateVisibleRegions();
        },
        function(error){
          console.log('Error while trying to ge regions: '+error)
        });

  }

  function selectRegionOnMap(regionDetail){
    
    $scope.$apply(function(){
      $scope.searchFilters.regionFilter = regionDetail.name;
      $('#sb-map-feature-options').show();
    });

  };

  function updateRegionsDetails(){
    $scope.regionsDetails = [];
    if(selectedRegion != undefined){
      $scope.regionsDetails.push(selectedRegion)
    }
    if(searchedRegions.length > 0){
      searchedRegions.forEach(function(regionDetail, index){
        console.log("regionDetail: "+JSON.stringify(regionDetail));
        if($scope.selectedRegion != undefined && 
            regionDetail.name != selectedRegion.name){
          $scope.regionsDetails.push(regionDetail)
        }else{
          $scope.regionsDetails.push(regionDetail)
        }
      });
    }
  }

  sapsMap.on('mapMove',updateVisibleRegions)
  sapsMap.on('regionSelect',selectRegionOnMap)
  sapsMap.on('regionBoxSelect',callbackBoxSelectionInfo)

  loadRegions();

  //Interface controls
  $scope.submitSearch = function(){

    if(!$rootScope.validateDate($('#search-first-year-input').val())){
      $scope.firstYearFilter = $rootScope.parseDate($('#search-first-year-input').val())
    }

    if(!$rootScope.validateDate($('#search-last-year-input').val())){
      $scope.lastYearFilter = $rootScope.parseDate($('#search-last-year-input').val())
    }

    if($scope.firstYearFilter > $scope.lastYearFilter){
      console.log("Last year date must be greater than first year date")
      $scope.modalMsgError = "Last year date must be greater than first year date";
      hasError = true
    }

    console.log('regionFilter = '+$scope.regionFilter)

    //$scope.regionsDetails.push({name:"ola mundo"})

    searchedRegions = sapsMap.getRegionsByName($scope.regionFilter);
    //console.log("Returned: "+JSON.stringify(searchedRegions));
    searchedRegions.forEach(function(regionDetail, index){
      regionDetail.checked = false;
    });
    updateRegionsDetails();
  }

  $scope.cleanSearch = function(){

    $scope.allDetailsChecked = false;
    $scope.regionsDetails = [];
    selectedRegion = undefined;
    searchedRegions = [];

    $('#search-first-year-input').val('');
    $('#search-last-year-input').val('');

    $scope.searchFilters.generalSearch = '';
    $scope.searchFilters.regionFilter = '';
    $scope.searchFilters.sapsVersionOptFilter = $scope.DEFAULT_VALUE;
    $scope.searchFilters.sapsVersionFilter = '';
    $scope.searchFilters.sapsTagOptFilter = $scope.DEFAULT_VALUE;
    $scope.searchFilters.sapsTagFilter = '';
    $scope.searchFilters.satellite = '';
    
    $('#rad-filter-defaul-ver').prop( "checked", 'checked' );
    $('#rad-filter-other-ver').prop( "checked", null );
    $('#rad-filter-defaul-tag').prop( "checked", 'checked' );
    $('#rad-filter-other-tag').prop( "checked", null );

    $scope.satelliteOpts.forEach(function(item, index){
      $('#radio-satellite-'+(index+1)).prop( "checked", null );
    });

  }

  $scope.checkUncheckAllDetails = function(){
    $scope.allDetailsChecked = !$scope.allDetailsChecked;
    $scope.regionsDetails.forEach(function(regionDetail, index){
      regionDetail.checked = $scope.allDetailsChecked;
    });
  }
  $scope.zoomIn = function(){
    sapsMap.zoomIn()
  }
  $scope.zoomOut = function(){
    sapsMap.zoomOut()
  }
});
