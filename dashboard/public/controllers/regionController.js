var dashboardControllers = angular.module('dashboardControllers');

dashboardControllers.controller('RegionController', function($scope, $rootScope,
  $log, $filter, $http, $timeout, AuthenticationService, RegionService, EmailService,
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

  // Script options
  $scope.processingScripts =[
      {name:'DEFAULT', value:'default_script'},
      {name:'Script-01', value:'scp-01'},
      {name:'Script-02', value:'scp-02'},
  ]
  

  $scope.preProcessingScripts =[
      {name:'DEFAULT', value:'default_pre-script'},
      {name:'Pre-Script-01', value:'pscp-01'},
      {name:'Pre-Script-02', value:'pscp-02'},
  ]


  // Filters
  $scope.searchFilters = {
    generalSearch:'',
    regionFilter:'',
    processingScriptName:$scope.processingScripts[0].name,
    processingScriptValue:$scope.processingScripts[0].value,
    preProcessingScriptName:$scope.preProcessingScripts[0].name,
    preProcessingScriptValue:$scope.preProcessingScripts[0].value,
    satellite:''
  };

  $scope.linksSelected = false;

  // var htmlMsg = "<div id='emailInfo'>"+msg+"</div>"
  // var msgBody =  $('#global-sucess-modal').find('#msg-body')
  //   var previousMSG = msgBody.find('#msg');
  //   if(previousMSG){
  //     previousMSG.remove();
  //   }
  //   msgBody.append(htmlMsg);
  //   $('#global-sucess-modal').modal('show');

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

  // function updateRegionsDetails(){
  //   $scope.regionsDetails = [];
  //   if(selectedRegion != undefined){
  //     $scope.regionsDetails.push(selectedRegion)
  //   }
  //   if(searchedRegions.length > 0){
  //     searchedRegions.forEach(function(regionDetail, index){
  //       console.log("regionDetail: "+JSON.stringify(regionDetail));
  //       if($scope.selectedRegion != undefined && 
  //           regionDetail.name != selectedRegion.name){
  //         $scope.regionsDetails.push(regionDetail)
  //       }else{
  //         $scope.regionsDetails.push(regionDetail)
  //       }
  //     });
  //   }
  // }

  sapsMap.on('mapMove',updateVisibleRegions)
  sapsMap.on('regionSelect',selectRegionOnMap)
  sapsMap.on('regionBoxSelect',callbackBoxSelectionInfo)

  loadRegions();

  //Interface controls
  $scope.changeProcScript = function(newScriptOpt){
    $scope.searchFilters.processingScriptName = newScriptOpt.name;
    $scope.searchFilters.processingScriptValue = newScriptOpt.value;
  };


  $scope.changePreProcScript = function(newScriptOpt){
    $scope.searchFilters.preProcessingScriptName = newScriptOpt.name;
    $scope.searchFilters.preProcessingScriptValue = newScriptOpt.value;
  }

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
      regionDetail.allImgChecked = false;
      regionDetail.images.forEach(function(img, i){
        img.checked = false;
      });
    });
    $scope.regionsDetails = searchedRegions;
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

  $scope.sendEmail = function(){

    var imgLinks = [];
    $scope.regionsDetails.forEach(function(regionDetail, index){
      if(regionDetail.checked){
        regionDetail.images.forEach(function(img, i){
          console.log("Img: "+JSON.stringify(img))
          if(img.checked){
            var newImgLinks = {
              imgName:img.name,
              links:[]
            }
            img.satellites.forEach(function(sat, ind){
              if(sat.link != undefined){
                newImgLinks.links.push(sat.link);
              }
            });
            if(newImgLinks.links.length > 0){
              imgLinks.push(newImgLinks);  
            }
          }
        })
      }
    });

    var email = {
      email:AuthenticationService.getUserName(),
      links:imgLinks
    }
    console.log("Sending "+JSON.stringify(email));

    EmailService.sendEmail(email, 
      function(data){
        console.log("Return: "+JSON.stringify(data))
        GlobalMsgService.globalSuccessModalMsg($rootScope.languageContent.messages.sendEmailSuccess)
    },function(error){
        console.log("Error: "+JSON.stringify(error))
    })
  }

  $scope.handleCheckUncheckAllDetails = function(){
    
    $scope.allDetailsChecked = !$scope.allDetailsChecked
    console.log("Handling for "+$scope.allDetailsChecked)
    $scope.checkUncheckAllDetails($scope.allDetailsChecked);
    $scope.linksSelected = hasAnyImageChecked();
  }
  $scope.checkUncheckAllDetails = function(check){
    $scope.regionsDetails.forEach(function(regionDetail, index){
      regionDetail.checked = check;
      $scope.checkUncheckAllImages(regionDetail, check);
    });
  }
  $scope.checkUncheckRegionDetail = function(regionDetail){
    var allChecked = true;
    console.log("Check Uncheck for "+JSON.stringify(regionDetail))
    $scope.checkUncheckAllImages(regionDetail, !regionDetail.checked);
    $scope.regionsDetails.forEach(function(rd, index){
      if(!rd.checked){
        allChecked=false;
      }
    });
    $scope.allDetailsChecked = allChecked;
    $scope.linksSelected = hasAnyImageChecked();
  }
  $scope.handleCheckUncheckAllImages = function(regionName){
    var check;
    for(var index=0; index < $scope.regionsDetails.length; index++){
        if($scope.regionsDetails[index].name == regionName){
          check = !$scope.regionsDetails[index].allImgChecked;
          $scope.checkUncheckAllImages($scope.regionsDetails[index], check);
          break;
        }
    }
    $scope.linksSelected = hasAnyImageChecked();
  }
  $scope.checkUncheckAllImages = function(regionDetail, check){

    regionDetail.allImgChecked = check;
   
    regionDetail.images.forEach(function(img, i){
      img.checked = check;
    })

    console.log("Check Uncheck all images for "+JSON.stringify(regionDetail))
  }
  $scope.checkUncheckImage = function(regionName){
    console.log("checkUncheckImage")
    for(var index=0; index < $scope.regionsDetails.length; index++){
        if($scope.regionsDetails[index].name == regionName){
          var allChecked = true;
          $scope.regionsDetails[index].images.forEach(function(img, i){
            console.log("Img Checked? "+img.checked)
            if(!img.checked){
              allChecked=false;
            }
          })
          $scope.regionsDetails[index].allImgChecked = allChecked;
          break;
        }
    }
    $scope.linksSelected = hasAnyImageChecked();
  }

  function hasAnyImageChecked(){
    if($scope.allDetailsChecked){
      return true;
    }
    for(var index=0; index < $scope.regionsDetails.length; index++){
        if($scope.regionsDetails[index].checked){
          return true;
        }
        if($scope.regionsDetails[index].allImgChecked){
          return true;
        }
        $scope.regionsDetails[index].images.forEach(function(img, i){
            console.log("Img Checked? "+img.checked)
            if(img.checked){
              return true
            }
        })
    }
    return false;
  }

  $scope.zoomIn = function(){
    sapsMap.zoomIn()
  }
  $scope.zoomOut = function(){
    sapsMap.zoomOut()
  }
});