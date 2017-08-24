!function(){"use strict";angular.module("check_in_app",["check_in_app.controllers","check_in_app.services","check_in_app.routes","check_in_app.config"]);angular.module("check_in_app.routes",["ui.router","ngStorage"]),angular.module("check_in_app.controllers",["ui.router","ngMaterial","ngMessages","ngStorage","mdPickers","nvd3","ngFileUpload"]),angular.module("check_in_app.services",["ngResource"]),angular.module("check_in_app.config",["ngMaterial"])}(),function(){"use strict";angular.module("check_in_app.config").constant("API_URL","api/v1/").config(["$mdIconProvider",function(e){e.fontSet("md","material-icons")}]).config(["$mdThemingProvider",function(e){e.theme("dark-grey").backgroundPalette("grey").dark(),e.theme("dark-orange").backgroundPalette("orange").dark(),e.theme("dark-purple").backgroundPalette("deep-purple").dark(),e.theme("dark-blue").backgroundPalette("blue").dark()}]).run(["$rootScope",function(e){e.hasAdminAccess=function(){return e.authUser?e.authUser.admin:0}}])}(),function(){"use strict";angular.module("check_in_app.routes").config(["$stateProvider","$urlRouterProvider","$httpProvider","$locationProvider",function(e,t,n,a){a.hashPrefix(""),e.state("signin",{url:"/signin",templateUrl:"./views/app/auth/auth.html",controller:"AuthCtrl",register:0}).state("guests",{url:"/guests",templateUrl:"./views/app/guests/guests.html",controller:"GuestCtrl"}).state("events",{url:"/events",templateUrl:"./views/app/events/events.html",controller:"EventCtrl"}).state("stats",{url:"/stats",templateUrl:"./views/app/stats/stats.html",controller:"StatsCtrl"}),t.otherwise("/events"),n.interceptors.push(["$q","$location","$localStorage",function(e,t,n){return{request:function(e){return e.headers=e.headers||{},n.token&&(e.headers.Authorization="Bearer "+n.token),e},responseError:function(n){return 400!==n.status&&401!==n.status&&403!==n.status||t.path("/signin"),e.reject(n)}}}])}])}(),function(){"use strict";angular.module("check_in_app.controllers").controller("AuthCtrl",["$rootScope","$scope","$state","$location","$localStorage","Auth","GuestSrv","AuthSrv",function(e,t,n,a,o,r,i,c){function s(e){o.token=e.data.token,window.location="#/events",i.getGuests(),c.getCurrentUser()}t.performLogin=function(){return t.register?t.signup():t.signin()},t.signin=function(){var n={email:t.credentials.email,password:t.credentials.password};e.error=null,r.signin(n,s,function(){e.error="Invalid email/password."})},t.signup=function(){var n={email:t.credentials.email,password:t.credentials.password};e.error=null,r.signup(n,s,function(t){t.errors&&t.errors[0]?e.error=t.errors[0]:e.error="Failed to signup"})},t.logout=function(){r.logout(function(){window.location="/"})},t.$on("$stateChangeSuccess",function(){t.register=n.current.register,t.loginText=t.register?"Register":"Login",e.error=null}),t.token=o.token,t.tokenClaims=r.getTokenClaims()}])}(),function(){"use strict";angular.module("check_in_app.services").factory("Auth",["$http","$localStorage","API_URL",function(e,t,n){function a(e){var t=e.replace("-","+").replace("_","/");switch(t.length%4){case 0:break;case 2:t+="==";break;case 3:t+="=";break;default:throw"Illegal base64url string!"}return window.atob(t)}function o(){var e=t.token,n={};if("undefined"!=typeof e){var o=e.split(".")[1];n=JSON.parse(a(o))}return n}var r=o();return{signup:function(t,a,o){e.post(n+"users/signup",t).then(a)["catch"](o)},signin:function(t,a,o){e.post(n+"users/signin",t).then(a)["catch"](o)},logout:function(e){r={},delete t.token,e()},getTokenClaims:function(){return r},me:function(t,a){e.get(n+"me").then(t)["catch"](a)}}}]).service("AuthSrv",["$rootScope","Auth",function(e,t){this.getCurrentUser=function(){t.me(function(t){e.authUser=t.data.data},function(e){})},this.getCurrentUser()}])}(),function(){"use strict";angular.module("check_in_app.controllers").controller("DialogCtrl",["$timeout","$q","$rootScope","$scope","$mdDialog","Guest","guests","currentEvent","currentGuest","Upload",function(e,t,n,a,o,r,i,c,s,u){var d=this;a.allGuests=i,a.currentEvent=c,a.currentGuest=s,a.checkInStatus=null,a.searchGuests=function(e){if(null===a.allGuests||"undefined"==typeof a.allGuests)return[];var t=e.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi,"u").replace(/[ç]/gi,"c").replace(/[ñ]/gi,"n"),n=a.allGuests.filter(function(e){var n=e.name.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi,"u").replace(/[ç]/gi,"c").replace(/[ñ]/gi,"n"),a=e.short_name.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi,"u").replace(/[ç]/gi,"c").replace(/[ñ]/gi,"n");return e.email&&e.email.toLowerCase().indexOf(t.toLowerCase())>-1||n.toLowerCase().indexOf(t.toLowerCase())>-1||e.slug&&e.slug.toLowerCase().indexOf(t.toLowerCase())>-1||a.toLowerCase().indexOf(t.toLowerCase())>-1});return n.slice(0,10)},a.selectedItemChange=function(e){return null!==a.selectedItem&&"undefined"!=typeof a.selectedItem&&(n.$broadcast("checkInEvent",{event:a.currentEvent,guest:a.selectedItem}),a.searchGuest=null,a.checkInStatus=a.selectedItem.short_name+" added!",!0)},a.onFileChange=function(e){e&&(a.file=e),u.upload({url:"/api/v1/guests/load",data:{file:a.file}}).then(function(e,t,n,o){a.loadedGuests=e.data.data})},d.uploadGuestCSV=function(e){return a.loadedGuests&&a.file?(u.upload({url:"/api/v1/guests/upload",data:{file:a.file}}).then(function(e,t,n,a){}),void d.finish()):(d.finish(),!1)},d.finishEditGuest=function(e){n.$broadcast("storeGuest"),d.finish()},d.finishEditEvent=function(e){n.$broadcast("storeEvent"),d.finish()},d.cancel=function(e){o.cancel()},d.finish=function(e){o.hide()}}])}(),function(){"use strict";angular.module("check_in_app.controllers").controller("GuestCtrl",["$rootScope","$scope","$http","$stateParams","$location","$mdDialog","$mdToast","$window","API_URL","Guest","GuestSrv","AuthSrv","CountrySrv",function(e,t,n,a,o,r,i,c,s,u,d,l,m){function g(){t.$digest()}t.filterGraduated=0,t.countries=m.allCountries(),t.openGuestEditDialog=function(e,n,a){t.editMode=n,"undefined"!=typeof a?t.currentGuest=a:t.currentGuest={},r.show({controller:"DialogCtrl",controllerAs:"ctrl",templateUrl:"./views/app/dialogs/edit_guest.html",locals:{guests:t.guests,currentEvent:null,currentGuest:t.currentGuest},parent:angular.element(document.body),scope:t,preserveScope:!0,targetEvent:e,clickOutsideToClose:!0})},t.openGuestUploadDialog=function(e){r.show({controller:"DialogCtrl",controllerAs:"ctrl",templateUrl:"./views/app/dialogs/guest_upload.html",locals:{guests:t.guests,currentEvent:null,currentGuest:null},parent:angular.element(document.body),scope:t,preserveScope:!0,targetEvent:e,clickOutsideToClose:!0})},t.showDeleteGuest=function(e,n){var a=r.confirm().title("Are you sure you want to delete this guest?").textContent("This action cannot be undone.").ariaLabel("Delete Guest").targetEvent(e).ok("Yes").cancel("Undo");r.show(a).then(function(){var e=t.guests.indexOf(n);e!==-1&&(t.guests.splice(e,1),u["delete"]({guestId:n.id}),t.currentGuest=null,t.showGuestDeleted(),t.dialogStatus="Guest Deleted.")},function(){})},t.showGuestDeleted=function(){i.show(i.simple().textContent("Guest Deleted!").position("top right").hideDelay(3e3))},t.getGuestRepeaterHeight=function(){var e=c.innerHeight,t=$("#navbar").outerHeight(!0),n=$("#guestListHeader").outerHeight(!0),a=$("#guestTableHeader").outerHeight(!0),o=e-t-n-a-10;return{height:""+o+"px"}},t.sortGuests=function(e){return e===t.sortGuest?(t.sortGuestReverse=!t.sortGuestReverse,t.sortGuest=t.sortGuestReverse===!1?null:t.sortGuest):(t.sortGuest=e,t.sortGuestReverse=!1),t.sortIcon=t.sortGuestReverse?"arrow_drop_down":"arrow_drop_up",!0},t.downloadGuestsCsv=function(){u.get({csv:1},function(e){var t=new Blob([e.data],{type:"application/csv"}),n=URL.createObjectURL(t),a=document.createElement("a");a.href=n,a.target="_blank",a.download="guests.csv",document.body.appendChild(a),a.click()},function(e){})},t.switchFilterGraduated=function(){t.filterGraduated=t.filterGraduated?0:1},c.addEventListener("resize",g),t.$on("storeGuest",function(e){u.store({guest:t.currentGuest},function(e){var n=e.data,a=t.guests.map(function(e){return e.id}).indexOf(n.id);if(a===-1){var o=JSON.parse(JSON.stringify(n));t.guests.unshift(o)}},function(e){})}),t.$on("$destroy",function(){c.removeEventListener("resize",g)})}])}(),function(){"use strict";angular.module("check_in_app.services").factory("Guest",["$resource","API_URL",function(e,t){return e(t+"guests",{},{checkIn:{url:t+"events/:eventSlug/guests/:guestId/:data",method:"POST",params:{eventSlug:"@eventSlug",guestId:"@guestId",data:"@data"}},remove:{url:t+"events/:eventSlug/guests/:guestId/:data",method:"POST",params:{eventSlug:"@eventSlug",guestId:"@guestId",data:"@data"}},"delete":{url:t+"guests/:guestId/delete",method:"POST",params:{guestId:"@guestId"}},store:{url:t+"guests/store",method:"POST",params:{guest:"@guest"}},upload:{url:t+"guests/upload",method:"POST",params:{guests:"@guests"}}})}]).service("GuestSrv",["$rootScope","Guest",function(e,t){this.getGuests=function(){t.get(function(t){e.guests=t.data},function(e){})},this.getGuests()}])}(),function(){"use strict";angular.module("check_in_app.services").factory("Item",["$resource","API_URL",function(e,t){return e(t+"items/:type",{type:"@type"},{updateAll:{method:"POST",params:{type:"@type",items:"@items"}}})}]).service("DegreeSrv",["$rootScope","Item",function(e,t){this.getDegrees=function(){t.get({type:"degrees"},function(t){"undefined"==typeof e.items&&(e.items={}),e.items.degrees={current:t.data}},function(e){})}}]).service("CategorySrv",["$rootScope","Item",function(e,t){this.getCategories=function(){t.get({type:"categories"},function(t){"undefined"==typeof e.items&&(e.items={}),e.items.categories={current:t.data}},function(e){})}}]).service("IndustrySrv",["$rootScope","Item",function(e,t){this.getIndustries=function(){t.get({type:"industries"},function(t){"undefined"==typeof e.items&&(e.items={}),e.items.industries={current:t.data}},function(e){})}}])}(),function(){"use strict";angular.module("check_in_app.controllers").controller("EventCtrl",["$rootScope","$window","$scope","$http","$stateParams","$location","$mdDialog","$mdMedia","$mdToast","API_URL","Event","Guest","GuestSrv","AuthSrv","mobileSrv",function(e,t,n,a,o,r,i,c,s,u,d,l,m,g,p){function f(){n.$digest()}n.openGuestDialog=function(e){n.checkInStatus=null,i.show({controller:"DialogCtrl",controllerAs:"ctrl",templateUrl:"./views/app/dialogs/guest_checkin"+(p.mobileAndTabletCheck()?"_mobile":"")+".html",parent:angular.element(document.body),locals:{guests:n.guests,currentEvent:n.currentEvent,currentGuest:null},targetEvent:e,clickOutsideToClose:!0})},n.openEventDialog=function(e,t){t&&n.uncheckCurrentEvent(),i.show({controller:"DialogCtrl",controllerAs:"ctrl",templateUrl:"./views/app/dialogs/edit_event.html",locals:{guests:null,currentEvent:n.currentEvent,currentGuest:null},parent:angular.element(document.body),scope:n,preserveScope:!0,targetEvent:e,clickOutsideToClose:!0})},n.openEventMenu=function(e,t){e(t)},n.selectEvent=function(e){r.search({p:e.slug})},n.findEvent=function(e){if(!n.events)return!1;var t=n.events.find(function(t){return t.slug==e});return t},n.setCurrentEvent=function(e){n.eventId=e.id,n.currentEvent=e,n.loadingGuests=!0,n.currentGuests=[];d.get({eventSlug:e.slug,data:"guests"},function(e){n.loadingGuests=!1,n.currentGuests=e.data},function(e){})},n.uncheckCurrentEvent=function(){n.eventId=null,n.currentEvent=0,n.loadingGuests=!1,n.currentGuests=[],r.search({})},n.checkCurrentEvent=function(){var e=r.search();if("undefined"!=typeof e.p){var t=e.p,a=n.findEvent(t);"undefined"!=typeof a&&n.eventId!==a.id&&n.setCurrentEvent(a)}return!0},n.sortEvents=function(e,t){n.sortEvent=e,n.sortEventReverse=t},n.checkInGuest=function(e,t){l.checkIn({eventSlug:e.slug,guestId:t.id,data:"checkin"},function(e){n.currentEvent.guest_count=n.currentGuests.length},function(e){});var a=n.currentGuests.map(function(e){return e.id}).indexOf(t.id);if(a!==-1)n.currentGuests[a].check_in=!n.currentGuests[a].check_in;else{var o=JSON.parse(JSON.stringify(t));o.check_in=1,n.currentGuests.unshift(o)}return angular.element(window).triggerHandler("resize"),!0},n.showRemoveEvent=function(e,t){var a=i.confirm().title("Are you sure you want to delete this event?").textContent("This action cannot be undone.").ariaLabel("Delete Event").targetEvent(e).ok("Yes").cancel("Undo");i.show(a).then(function(){var e=n.events.indexOf(t);e!==-1&&(n.events.splice(e,1),d["delete"]({eventSlug:t.slug}),n.currentEvent={},n.currentGuests=null,n.showEventDeleted(),n.status="Event Deleted.")},function(){})},n.showEventDeleted=function(){s.show(s.simple().textContent("Event Deleted!").position("top right").hideDelay(3e3))},n.showRemoveGuest=function(e,t,a){var o=i.confirm().title("Are you sure you want to remove this guest?").textContent("This action cannot be undone.").ariaLabel("Remove Guest").targetEvent(e).ok("Yes").cancel("Undo");i.show(o).then(function(){var e=n.currentGuests.indexOf(a);e!==-1&&(l.remove({eventSlug:t.slug,guestId:a.id,data:"remove"},function(e){n.currentEvent.guest_count=n.currentGuests.length},function(e){}),n.currentGuests.splice(e,1),n.currentGuest=null,n.showGuestRemoved(),n.status="Guest Removed.")},function(){})},n.showGuestRemoved=function(){s.show(s.simple().textContent("Guest Removed!").position("top right").hideDelay(3e3))},n.getEventGuestRepeaterHeight=function(){var e=t.innerHeight,n=$("#navbar").outerHeight(!0),a=$("#eventHeader").outerHeight(!0),o=e-n-a-10;return{height:""+o+"px"}},n.getEventRepeaterHeight=function(){var e=t.innerHeight,n=$("#navbar").outerHeight(!0),a=$("#eventSearchBar").outerHeight(!0),o=e-n-a-10;return{height:""+o+"px"}},n.showEventListMobile=function(){return!n.currentEvent||c("gt-sm")},n.showGuestListMobile=function(){return n.currentEvent||c("gt-sm")},n.eventSortComparator=function(e){switch(n.sortEvent){case"date":return e.date;case"name":return e.name;default:return e.upcoming_index>=0?e.upcoming_index:-1*e.upcoming_index+n.events.length}},n.downloadGuestsCsv=function(e){d.get({eventSlug:e.slug,data:"guests",csv:1},function(t){var n=new Blob([t.data],{type:"application/csv"}),a=URL.createObjectURL(n),o=document.createElement("a");o.href=a,o.target="_blank",o.download=e.slug+"_guests.csv",document.body.appendChild(o),o.click()},function(e){})},t.addEventListener("resize",f),n.$on("storeEvent",function(e){"undefined"!=typeof n.currentEvent.time&&"undefined"!=typeof n.currentEvent.date&&(n.currentEvent.date.setHours(n.currentEvent.time.getHours()),n.currentEvent.date.setMinutes(n.currentEvent.time.getMinutes())),n.currentEvent.date_formatted=moment(n.currentEvent.date).format("DD/MM/YY HH:mm"),d.store({event:n.currentEvent},function(e){var t=e.data,a=n.events.map(function(e){return e.id}).indexOf(t.id);if(a===-1){var o=JSON.parse(JSON.stringify(t));n.events.unshift(o),n.currentEvent=o}},function(e){})}),n.$on("checkInEvent",function(e,t){var a=t.event,o=t.guest;n.checkInGuest(a,o)}),n.$watch(function(){return r.search()},function(e){n.checkCurrentEvent()}),n.$on("$destroy",function(){t.removeEventListener("resize",f)}),n.$on("openEventDialog",function(e,t){n.openEventDialog(t.event,t.newEvent)}),d.get(function(e){n.events=e.data,angular.forEach(n.events,function(e,t){var a=moment(n.events[t].date.date);n.events[t].date=new Date(a),n.events[t].time=new Date(a)}),n.checkCurrentEvent()}),n.loadingGuests=!1,n.sortEvent="upcoming"}])}(),function(){"use strict";angular.module("check_in_app.services").factory("Event",["$resource","API_URL",function(e,t){return e(t+"events/:eventSlug/:data",{},{"delete":{url:t+"events/:eventSlug/delete",method:"POST",params:{eventSlug:"@eventSlug",csv:"@csv"}},store:{url:t+"events/store",method:"POST",params:{event:"@event"}}})}])}(),function(){"use strict";angular.module("check_in_app.controllers").controller("NavbarCtrl",["$rootScope","$window","$scope","$http","$mdDialog","mdDialogSrv","Auth","Item","DegreeSrv","CategorySrv","IndustrySrv",function(e,t,n,a,o,r,i,c,s,u,d){n.logout=function(){i.logout(function(){window.location="/"})},n.openDegreesDialog=function(e){r.fromTemplate("./views/app/dialogs/edit_degrees.html",e,n)},n.openCategoriesDialog=function(e){r.fromTemplate("./views/app/dialogs/edit_categories.html",e,n)},n.openIndustriesDialog=function(e){r.fromTemplate("./views/app/dialogs/edit_industries.html",event,n)},n.deleteItem=function(e,t){return n.items[e].current.splice(t,1),!0},n.createItem=function(e){return!!n.items[e]["new"]&&(n.items[e].current||(n.items[e].current=[]),n.items[e].current.push(n.items[e]["new"]),n.items[e]["new"]=null,!0)},n.cancelEditMenu=function(){r.cancel()},n.finishEditMenu=function(e){c.updateAll({items:n.items[e].current,type:e},function(e){}),r.hide()},s.getDegrees(),u.getCategories(),d.getIndustries()}])}(),function(){"use strict";angular.module("check_in_app.services").factory("User",["$resource","API_URL",function(e,t){return e(t+"users/:id",{type:"@type"},{getAll:{method:"GET",params:{type:"@type",items:"@items"}},update:{method:"GET",params:{type:"@type",items:"@items"}}})}]).service("DegreeSrv",["$rootScope","Item",function(e,t){this.getDegrees=function(){t.get({type:"degrees"},function(t){"undefined"==typeof e.items&&(e.items={}),e.items.degrees={current:t.data}},function(e){})}}])}(),function(){"use strict";angular.module("check_in_app.controllers").controller("StatsCtrl",["$rootScope","$window","$scope","$http","Stats",function(e,t,n,a,o){n.parseEventStats=function(){n.data={},n.parseIndustryAbsData(),n.parseIndustryPercentageData(),n.parseTimeData(),n.parseCountriesData()},n.parseIndustryAbsData=function(){n.data.industry_abs=[],angular.forEach(n.eventStats.industries_abs,function(e,t){var a=n.data.industry_abs.push({key:t,values:[]});angular.forEach(e,function(e,t){return""!==t&&void n.data.industry_abs[a-1].values.push({x:t,y:e})})})},n.parseIndustryPercentageData=function(){n.data.industry_percentage=[],angular.forEach(n.eventStats.industries_percentage,function(e,t){return""!==t&&void n.data.industry_percentage.push({key:t,y:e})})},n.parseTimeData=function(){n.data.time=[],angular.forEach(n.eventStats.time,function(e,t){var a=n.data.time.push({key:t,values:[],strokeWidth:2,area:!0});angular.forEach(e,function(e,t){return""!==t&&void n.data.time[a-1].values.push({x:t,y:e})})})},n.parseCountriesData=function(){n.data.countries=[],angular.forEach(n.eventStats.countries,function(e,t){return"--"!==t&&0!==e&&void n.data.countries.push({key:t,y:e})})},n.setChartsOptions=function(){n.options={},n.options.industry_abs={chart:{type:"multiBarChart",height:300,margin:{top:20,right:20,bottom:45,left:45},groupSpacing:.5,clipEdge:!0,duration:500,stacked:!0,reduceXTicks:!1,useInteractiveGuideline:!0,xAxis:{rotateLabels:-45,showMaxMin:!1},yAxis:{axisLabel:"Attendance",axisLabelDistance:-20,tickFormat:function(e){return d3.format("d")(e)}}}},n.options.industry_percentage={chart:{type:"pieChart",height:350,x:function(e){return e.key},y:function(e){return e.y},showLabels:!0,labelSunbeamLayout:!1,donut:!0,donutRatio:.35,labelType:"percent",duration:500,labelThreshold:.01,legend:{margin:{top:5,right:35,bottom:5,left:0}}}},n.options.time={chart:{type:"lineChart",height:300,margin:{top:20,right:20,bottom:40,left:55},x:function(e){return e.x},y:function(e){return e.y},useInteractiveGuideline:!0,xAxis:{axisLabel:"Date",tickFormat:function(e){return d3.time.format("%B %Y")(new Date(Number(e)))}},yAxis:{axisLabel:"Attendance",axisLabelDistance:-10,tickFormat:function(e){return d3.format("d")(e)}}}},n.options.countries={chart:{type:"pieChart",height:300,x:function(e){return e.key},y:function(e){return e.y},showLabels:!0,labelSunbeamLayout:!1,donut:!1,labelType:"percent",duration:500,labelThreshold:.01,legend:{margin:{top:5,right:35,bottom:5,left:0}}}}},n.getFilters=function(){return{start_date:n.filters.start_date?moment(n.filters.start_date).format("YYYY/MM/DD HH:mm"):null,end_date:n.filters.end_date?moment(n.filters.end_date).format("YYYY/MM/DD HH:mm"):null}},n.dateRangeChanged=function(){"custom"===n.dateRange.key?(n.filters={start_date:null,end_date:null},n.customRangeActive=!0):(n.filters={start_date:n.dateRange.start_date,end_date:n.dateRange.end_date},n.getStats())},n.setCustomDateRange=function(){n.customRangeActive=!1,n.dateRange.description=(n.filters.start_date?moment(n.filters.start_date).format("YYYY/MM/DD"):"∞")+" → "+(n.filters.end_date?moment(n.filters.end_date).format("YYYY/MM/DD"):"∞"),n.getStats()},n.getStats=function(){o.events(n.getFilters(),function(e){n.eventStats=e.data,n.parseEventStats()}),o.global(n.getFilters(),function(e){n.globalStats=e.data})},n.setDefaultDateRangeFilters=function(){n.dateRanges=[{key:"alltime",description:"All-time"},{key:"monthly",description:"This Month",start_date:moment().startOf("month")._d},{key:"yearly",description:"This Year",start_date:moment().startOf("year")._d},{key:"custom",description:"Pick a date range..."}]},n.setDefaultDateRangeFilters(),n.dateRange=n.dateRanges[0],n.filters={start_date:null,end_date:null},n.getStats(),n.setChartsOptions()}])}(),function(){"use strict";angular.module("check_in_app.services").factory("Stats",["$resource","API_URL",function(e,t){return e(t+"stats",{},{global:{url:t+"stats/global",method:"GET",params:{filters:"@filters"}},events:{url:t+"stats/events",method:"GET",params:{filters:"@filters"}}})}])}(),angular.module("check_in_app.services").factory("CountrySrv",function(){return countries=[{name:"Afghanistan",code:"AF"},{name:"Åland Islands",code:"AX"},{name:"Albania",code:"AL"},{name:"Algeria",code:"DZ"},{name:"American Samoa",code:"AS"},{name:"Andorra",code:"AD"},{name:"Angola",code:"AO"},{name:"Anguilla",code:"AI"},{name:"Antarctica",code:"AQ"},{name:"Antigua and Barbuda",code:"AG"},{name:"Argentina",code:"AR"},{name:"Armenia",code:"AM"},{name:"Aruba",code:"AW"},{name:"Australia",code:"AU"},{name:"Austria",code:"AT"},{name:"Azerbaijan",code:"AZ"},{name:"Bahamas",code:"BS"},{name:"Bahrain",code:"BH"},{name:"Bangladesh",code:"BD"},{name:"Barbados",code:"BB"},{name:"Belarus",code:"BY"},{name:"Belgium",code:"BE"},{name:"Belize",code:"BZ"},{name:"Benin",code:"BJ"},{name:"Bermuda",code:"BM"},{name:"Bhutan",code:"BT"},{name:"Bolivia",code:"BO"},{name:"Bosnia and Herzegovina",code:"BA"},{name:"Botswana",code:"BW"},{name:"Bouvet Island",code:"BV"},{name:"Brazil",code:"BR"},{name:"British Indian Ocean Territory",code:"IO"},{name:"Brunei Darussalam",code:"BN"},{name:"Bulgaria",code:"BG"},{name:"Burkina Faso",code:"BF"},{name:"Burundi",code:"BI"},{name:"Cambodia",code:"KH"},{name:"Cameroon",code:"CM"},{name:"Canada",code:"CA"},{name:"Cape Verde",code:"CV"},{name:"Cayman Islands",code:"KY"},{name:"Central African Republic",code:"CF"},{name:"Chad",code:"TD"},{name:"Chile",code:"CL"},{name:"China",code:"CN"},{name:"Christmas Island",code:"CX"},{name:"Cocos (Keeling) Islands",code:"CC"},{name:"Colombia",code:"CO"},{name:"Comoros",code:"KM"},{name:"Congo",code:"CG"},{name:"Congo, The Democratic Republic of the",code:"CD"},{name:"Cook Islands",code:"CK"},{name:"Costa Rica",code:"CR"},{name:"Cote D'Ivoire",code:"CI"},{name:"Croatia",code:"HR"},{name:"Cuba",code:"CU"},{name:"Cyprus",code:"CY"},{name:"Czech Republic",code:"CZ"},{name:"Denmark",code:"DK"},{name:"Djibouti",code:"DJ"},{name:"Dominica",code:"DM"},{name:"Dominican Republic",code:"DO"},{name:"Ecuador",code:"EC"},{name:"Egypt",code:"EG"},{name:"El Salvador",code:"SV"},{name:"Equatorial Guinea",code:"GQ"},{name:"Eritrea",code:"ER"},{name:"Estonia",code:"EE"},{name:"Ethiopia",code:"ET"},{name:"Falkland Islands (Malvinas)",code:"FK"},{name:"Faroe Islands",code:"FO"},{name:"Fiji",code:"FJ"},{name:"Finland",code:"FI"},{name:"France",code:"FR"},{name:"French Guiana",code:"GF"},{name:"French Polynesia",code:"PF"},{name:"French Southern Territories",code:"TF"},{name:"Gabon",code:"GA"},{name:"Gambia",code:"GM"},{name:"Georgia",code:"GE"},{name:"Germany",code:"DE"},{name:"Ghana",code:"GH"},{name:"Gibraltar",code:"GI"},{name:"Greece",code:"GR"},{name:"Greenland",code:"GL"},{name:"Grenada",code:"GD"},{name:"Guadeloupe",code:"GP"},{name:"Guam",code:"GU"},{name:"Guatemala",code:"GT"},{name:"Guernsey",code:"GG"},{name:"Guinea",code:"GN"},{name:"Guinea-Bissau",code:"GW"},{name:"Guyana",code:"GY"},{name:"Haiti",code:"HT"},{name:"Heard Island and Mcdonald Islands",code:"HM"},{name:"Holy See (Vatican City State)",code:"VA"},{name:"Honduras",code:"HN"},{name:"Hong Kong",code:"HK"},{name:"Hungary",code:"HU"},{name:"Iceland",code:"IS"},{name:"India",code:"IN"},{name:"Indonesia",code:"ID"},{name:"Iran, Islamic Republic Of",code:"IR"},{name:"Iraq",code:"IQ"},{name:"Ireland",code:"IE"},{name:"Isle of Man",code:"IM"},{name:"Israel",code:"IL"},{name:"Italy",code:"IT"},{name:"Jamaica",code:"JM"},{name:"Japan",code:"JP"},{name:"Jersey",code:"JE"},{name:"Jordan",code:"JO"},{name:"Kazakhstan",code:"KZ"},{name:"Kenya",code:"KE"},{name:"Kiribati",code:"KI"},{name:"Democratic People's Republic of Korea",code:"KP"},{name:"Korea, Republic of",code:"KR"},{name:"Kosovo",code:"XK"},{name:"Kuwait",code:"KW"},{name:"Kyrgyzstan",code:"KG"},{name:"Lao People's Democratic Republic",code:"LA"},{name:"Latvia",code:"LV"},{name:"Lebanon",code:"LB"},{name:"Lesotho",code:"LS"},{name:"Liberia",code:"LR"},{name:"Libyan Arab Jamahiriya",code:"LY"},{name:"Liechtenstein",code:"LI"},{name:"Lithuania",code:"LT"},{name:"Luxembourg",code:"LU"},{name:"Macao",code:"MO"},{name:"Macedonia, The Former Yugoslav Republic of",code:"MK"},{name:"Madagascar",code:"MG"},{name:"Malawi",code:"MW"},{name:"Malaysia",code:"MY"},{name:"Maldives",code:"MV"},{name:"Mali",code:"ML"},{name:"Malta",code:"MT"},{name:"Marshall Islands",code:"MH"},{name:"Martinique",code:"MQ"},{name:"Mauritania",code:"MR"},{name:"Mauritius",code:"MU"},{name:"Mayotte",code:"YT"},{name:"Mexico",code:"MX"},{name:"Micronesia, Federated States of",code:"FM"},{name:"Moldova, Republic of",code:"MD"},{name:"Monaco",code:"MC"},{name:"Mongolia",code:"MN"},{name:"Montenegro",code:"ME"},{name:"Montserrat",code:"MS"},{name:"Morocco",code:"MA"},{name:"Mozambique",code:"MZ"},{name:"Myanmar",code:"MM"},{name:"Namibia",code:"NA"},{name:"Nauru",code:"NR"},{name:"Nepal",code:"NP"},{name:"Netherlands",code:"NL"},{name:"Netherlands Antilles",code:"AN"},{name:"New Caledonia",code:"NC"},{name:"New Zealand",code:"NZ"},{name:"Nicaragua",code:"NI"},{name:"Niger",code:"NE"},{name:"Nigeria",code:"NG"},{name:"Niue",code:"NU"},{name:"Norfolk Island",code:"NF"},{name:"Northern Mariana Islands",code:"MP"},{name:"Norway",code:"NO"},{name:"Oman",code:"OM"},{name:"Pakistan",code:"PK"},{name:"Palau",code:"PW"},{name:"Palestinian Territory, Occupied",code:"PS"},{name:"Panama",code:"PA"},{name:"Papua New Guinea",code:"PG"},{name:"Paraguay",code:"PY"},{name:"Peru",code:"PE"},{name:"Philippines",code:"PH"},{name:"Pitcairn",code:"PN"},{name:"Poland",code:"PL"},{name:"Portugal",code:"PT"},{name:"Puerto Rico",code:"PR"},{name:"Qatar",code:"QA"},{name:"Reunion",code:"RE"},{name:"Romania",code:"RO"},{name:"Russian Federation",code:"RU"},{name:"Rwanda",code:"RW"},{name:"Saint Helena",code:"SH"},{name:"Saint Kitts and Nevis",code:"KN"},{name:"Saint Lucia",code:"LC"},{name:"Saint Pierre and Miquelon",code:"PM"},{name:"Saint Vincent and the Grenadines",code:"VC"},{name:"Samoa",code:"WS"},{name:"San Marino",code:"SM"},{name:"Sao Tome and Principe",code:"ST"},{name:"Saudi Arabia",code:"SA"},{name:"Senegal",code:"SN"},{name:"Serbia",code:"RS"},{name:"Seychelles",code:"SC"},{name:"Sierra Leone",code:"SL"},{name:"Singapore",code:"SG"},{name:"Slovakia",code:"SK"},{name:"Slovenia",code:"SI"},{name:"Solomon Islands",code:"SB"},{name:"Somalia",code:"SO"},{name:"South Africa",code:"ZA"},{name:"South Georgia and the South Sandwich Islands",code:"GS"},{name:"Spain",code:"ES"},{name:"Sri Lanka",code:"LK"},{name:"Sudan",code:"SD"},{name:"Suriname",code:"SR"},{name:"Svalbard and Jan Mayen",code:"SJ"},{name:"Swaziland",code:"SZ"},{name:"Sweden",code:"SE"},{name:"Switzerland",code:"CH"},{name:"Syrian Arab Republic",code:"SY"},{name:"Taiwan",code:"TW"},{name:"Tajikistan",code:"TJ"},{name:"Tanzania, United Republic of",code:"TZ"},{name:"Thailand",code:"TH"},{name:"Timor-Leste",code:"TL"},{name:"Togo",code:"TG"},{name:"Tokelau",code:"TK"},{name:"Tonga",code:"TO"},{name:"Trinidad and Tobago",code:"TT"},{name:"Tunisia",code:"TN"},{name:"Turkey",code:"TR"},{name:"Turkmenistan",code:"TM"},{name:"Turks and Caicos Islands",code:"TC"},{name:"Tuvalu",code:"TV"},{name:"Uganda",code:"UG"},{name:"Ukraine",code:"UA"},{name:"United Arab Emirates",code:"AE"},{name:"United Kingdom",code:"GB"},{name:"United States",code:"US"},{name:"United States Minor Outlying Islands",code:"UM"},{name:"Uruguay",code:"UY"},{name:"Uzbekistan",code:"UZ"},{name:"Vanuatu",code:"VU"},{name:"Venezuela",code:"VE"},{name:"Viet Nam",code:"VN"},{name:"Virgin Islands, British",code:"VG"},{name:"Virgin Islands, U.S.",code:"VI"},{name:"Wallis and Futuna",code:"WF"},{name:"Western Sahara",code:"EH"},{name:"Yemen",code:"YE"},{name:"Zambia",code:"ZM"},{name:"Zimbabwe",code:"ZW"},{name:"Unknown",code:"--"}],{allCountries:function(){return countries}}}),angular.module("check_in_app.services").factory("mobileSrv",function(){return{mobileCheck:function(){var e=!1;return function(t){(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(t)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(t.substr(0,4)))&&(e=!0)}(navigator.userAgent||navigator.vendor||window.opera),e},mobileAndTabletCheck:function(){var e=!1;return function(t){(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(t)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(t.substr(0,4)))&&(e=!0);
}(navigator.userAgent||navigator.vendor||window.opera),e}}}),angular.module("check_in_app.services").factory("mdDialogSrv",["$mdDialog",function(e){return{fromTemplate:function(t,n,a){var o={templateUrl:t,targetEvent:n,clickOutsideToClose:!0};return a&&(o.scope=a.$new()),e.show(o)},hide:function(){return e.hide()},cancel:function(){return e.cancel()},alert:function(t,n){e.show(e.alert().title(t).content(n).ok("Ok"))},confirm:function(t,n,a,o){var r=e.confirm().title(n.title).textContent(n.textContent).ariaLabel(n.ariaLabel).targetEvent(t).ok(n.ok).cancel(n.cancel);e.show(r).then(a,o)}}}]);