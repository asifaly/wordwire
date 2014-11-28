/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
var wordWire = angular.module('wordWire', ['firebase', 'ngRoute']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');

wordWire.run(['$templateCache', '$http', '$rootScope', '$location', function ($templateCache, $http, $rootScope, $location) {
    $http.get('partials/login.html', {cache: $templateCache});
    $http.get('partials/game.html', {cache: $templateCache});
    $http.get('partials/words.html', {cache: $templateCache});
    $http.get('partials/players.html', {cache: $templateCache});
    $rootScope.$on("$routeChangeError", function(event, next, previous, error) {
    if (error === "AUTH_REQUIRED") {
        $location.path("/login");
    }
  });
}]);

wordWire.config(['$routeProvider',
        function ($routeProvider) {
        $routeProvider.
            when('/game', {
                templateUrl: 'partials/game.html',
                controller: 'WordCtrl',
                resolve: {
                    'currentAuth': ['Auth', function(Auth) {
                        return Auth.$requireAuth();
                    }]
                }
            }).
            when('/login', {
                templateUrl: 'partials/login.html',
                controller: 'WordCtrl',
                resolve: {
                    'currentAuth': ['Auth', function(Auth) {
                        return Auth.$waitForAuth();
                    }]
                }
            }).
            when('/players', {
                templateUrl: 'partials/players.html',
                controller: 'WordCtrl',
                resolve: {
                    'currentAuth': ['Auth', function(Auth) {
                        return Auth.$requireAuth();
                    }]
                }
            }).
            when('/words', {
                templateUrl: 'partials/words.html',
                controller: 'WordCtrl',
                resolve: {
                    'currentAuth': ['Auth', function(Auth) {
                        return Auth.$requireAuth();
                    }]
                }
            }).
            otherwise({
                redirectTo: '/login'
            });
    }]);

wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter', 'Auth', 'UserService', 'WordsService', '$location',
    function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter, Auth, UserService, WordsService, $location) {
        //initialize pattern if it is not done, when app initializes, there is an error for invalid pattern
        $scope.stats = {};
        $scope.stats.pattern = new RegExp();
        $scope.newword = {
            name: '',
            score: ''
        };
        $scope.user = {
            displayName: '',
            uid: '',
            avatar: ''
        };

        $scope.isActive = function(route) {
        return route === $location.path();
        };

        //defining firebase instances
        var sRef = new Firebase(FIREBASE_URI + "stats/");

        $scope.authObj = Auth;

        //logout user
        $scope.logout = function logout() {
            $scope.authObj.$unauth();
            Firebase.goOffline(); //go offline from firebase on logout to show only logged in online users
            $scope.user = {
                displayName: '',
                uid: ''
            };
            $location.path("/login");
        };

        //social login user
        $scope.login = function socialLogin(provider) {
            Firebase.goOnline();
            $scope.authObj.$authWithOAuthPopup(provider).then(function (authData) {
                    $location.path("/game");
                UserService.addUser(authData).then(function (data) {
                    console.info("New User Added");
                }).catch(function (error) {
                    console.error("Authentication failed:", error);
                });
            });
        };

        //onAuth update$scope.user
        $scope.authObj.$onAuth(function (authData) {
            if (authData) {
                //onlogin, presence will be updated to true i.e to show online users
                UserService.presence(authData).then(function (data) {
                    $scope.user = data;
                });
            } else {
                console.log("Logged out");
            }
        });

        //watch for change in value of lastWord, firstLetter and pattern and update the$scope using regular firebase
        sRef.on("value", function statsFbGet(statssnapshot) {
            $timeout(function statsscopeSet() {
                //get value of firebase/stats
                $scope.stats = statssnapshot.val();
                //using filter to convert string to regex
                $scope.stats.pattern = $filter('strtoregex')(statssnapshot.val().pattern);
            });
        });

        //load values of words, scores and connected users from firebase
        $scope.words = WordsService.getWords();
        $scope.onlineusers = UserService.getOnline();
        //$scope.stats = WordsService.getStats();

        //$scope function is called on clicking the submit button
        $scope.addWord = function wordsFbAdd() {
            //create variables to update stats
            $scope.isReadOnly = true;

            var lastWord = $filter('lowercase')($scope.newword.name),
                firstLetter = $filter('firstlet')(lastWord),
                pattern = $filter('regtostr')($scope.stats.pattern, firstLetter);

            WordsService.checkWord(lastWord).then(function (data) {
                WordsService.dictCheck(lastWord).then(function (data) {
                    for (var attrname in data) {
                        $scope.newword[attrname] = data[attrname];
                    }

                    WordsService.addWord(angular.copy($scope.newword)).then(function (nref) {
                        console.info("New Word added at " + nref);
                        $scope.isReadOnly = false;
                        $scope.theForm.$setPristine();
                        $scope.newword = {
                            name: '',
                            score: ''
                        }; //clear the ng-model newword
                    });

                    WordsService.setStats(lastWord, pattern, firstLetter).then(function (stref) {
                        console.info("stats added at " + stref);
                    });
                }).catch(function (error) {
                    $window.alert(error);
                    $scope.isReadOnly = false;
                });
            }).catch(function (error) {
                $window.alert(error);
                $scope.isReadOnly = false;
            });
        };

        //watch for changes to input field ng-model=newword.name and compute newword.score
        $scope.$watch("newword.name", function (newValue, oldValue) {
            $scope.newword.score = $filter('score')(newValue);
        });
    }]);
