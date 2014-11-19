/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter', '$firebaseAuth',
    function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter, $firebaseAuth) {
        //initialize pattern if it is not done, when app initializes, there is an error for invalid pattern
        $scope.stats = {};
        $scope.stats.pattern = new RegExp();
        $scope.newword = {
            name: '',
            score: ''
        };
        $scope.user = {
            displayName: '',
            uid: ''
        };

        //defining firebase instances
        var wRef = new Firebase(FIREBASE_URI + "words/"),
            wordRef = $firebase(wRef.limitToLast(5)).$asArray(),
            sRef = new Firebase(FIREBASE_URI + "stats/"),
            statRef = $firebase(sRef), //can define $set only if it is not defined as Object or Array
            mainRef = new Firebase(FIREBASE_URI),
            listRef = new Firebase(FIREBASE_URI + "presence/"),
            uRef = new Firebase(FIREBASE_URI + "users/"),
            usrRef = $firebase(uRef),
            userRef = listRef.push(),
            presenceRef = new Firebase(FIREBASE_URI + ".info/connected");

        $scope.authObj = $firebaseAuth(mainRef);

        //logout user
        $scope.logout = function logout() {
            $scope.authObj.$unauth();
            $scope.user = {
                displayName: '',
                uid: ''
            };
        };

        //social login user
        $scope.login = function socialLogin(provider) {
            $scope.authObj.$authWithOAuthPopup(provider).then(function (authData) {
                console.log("Authentication Successful");
            }).catch(function (error) {
                console.error("Authentication failed:", error);
            });
        };

        //onAuth update scope.user
        $scope.authObj.$onAuth(function (authData) {
            if (authData) {
                if (authData.provider === 'google') {
                    $scope.user = {
                        displayName: authData.google.displayName,
                        uid: authData.uid
                    };
                } else if (authData.provider === 'facebook') {
                    $scope.user = {
                        displayName: authData.facebook.displayName,
                        uid: authData.uid
                    };
                } else if (authData.provider === 'twitter') {
                    $scope.user = {
                        displayName: authData.twitter.displayName,
                        uid: authData.uid
                    };
                }
            } else {
                console.log("Logged out");
            }
        });

        //watch for change in value of lastWord, firstLetter and pattern and update the scope using regular firebase
        sRef.on("value", function statsFbGet(statssnapshot) {
            $timeout(function statsScopeSet() {
                //get value of firebase/stats
                $scope.stats = statssnapshot.val();
                //using filter to convert string to regex
                $scope.stats.pattern = $filter('strtoregex')(statssnapshot.val().pattern);
            });
        });

        // Write a string when this client loses connection - for test purposes
        //presenceRef.onDisconnect().set("I disconnected!");

        //load last 5 values of words and scores from firebase using angularfire
        wordRef.$loaded().then(function wordsScopeSet(wordlist) {
            //load data to words on promise
            $scope.words = wordlist;
        });

        //this function is called on clicking the submit button
        $scope.addWord = function wordsFbAdd() {
            //create variables to update stats
            var lastWord = $scope.newword.name,
                firstLetter = $filter('firstlet')(lastWord),
                pattern = $filter('regtostr')($scope.stats.pattern, firstLetter),
                //create variables for dictionary check
                dictCheck = $filter('uppercase')(lastWord),
                firstTwo = $filter('uppercase')(lastWord.substr(0, 2)),
                dRef = FIREBASE_URI + "dictionary/" + firstTwo,
                //create new firebase instance, based on first 2 chars of new word
                dictRef = new Firebase(dRef);

            //check if the word entered is a valid english word using regular firebase
            dictRef.orderByKey().startAt(dictCheck).endAt(dictCheck).on("value", function checkDict(snapshot) {
                //if the word exists in the dictionary, i.e not equal to null
                if (snapshot.val() !== null) {
                    //check if the word already exists in firebase using regualr firebase
                    wRef.orderByChild("name").equalTo(lastWord).once("value", function checkExists(snapshot) {
                        if (snapshot.val() !== null) { //if word exists in firebase
                            $window.alert("word already exists chose another");
                        } else { //if does not exist in firebase, add it using angularfire
                            wordRef.$add(angular.copy($scope.newword)).then(function getNewWordKey(nref) {
                                var wid = nref.key();
                                console.log("newword added successfully" + wid);
                            });
                            $timeout(function statsFbSet() { //update lastWord, firstLetter and pattern based on newword using angularfire
                                statRef.$set({
                                    firstletter: firstLetter,
                                    lastword: lastWord,
                                    pattern: pattern
                                }).then(function statsScopeSet() {
                                    //$scope.stats.pattern = $filter('strtoregex')(pattern);
                                    $scope.newword = {
                                        name: '',
                                        score: ''
                                    }; //clear the ng-model newword

                                    $scope.myForm.$setPristine(true);
                                });
                            });
                        }
                    }, function (err) {
                        $window.alert("snap! its my fault..try again please.");
                    });
                } else {
                    $window.alert("word does not exist in my dictionary");
                }
            });
        };

        //watch for changes to input field ng-model=newword.name and compute newword.score
        $scope.$watch("newword.name", function (newValue, oldValue) {
            $scope.newword.score = $filter('score')(newValue);
        });
    }]);

//filter to catch the first letter of last word
wordWire.filter('firstlet', function () {
    return function (text) {
        if (text !== undefined) {
            text = text.charAt(text.length - 1);
            return text;
        } else {
            return text;
        }
    };
});

//filter to convert the string pattern to regex
wordWire.filter('strtoregex', function () {
    return function (text) {
        if (text !== undefined) {
            text = text.split("/");
            text = new RegExp(text[1], text[2]);
            return text;
        } else {
            return text;
        }
    };
});

//filter to convert the regex pattern to string to store in firebase
wordWire.filter('regtostr', function () {
    return function (text, first) {
        if (text !== undefined) {
            text = text.toString().split("");
            text[4] = first;
            text = text.join("");
            return text;
        } else {
            return text;
        }
    };
});

//filter to compute the wordscore based on newword in realtime
wordWire.filter('score', function () {
    return function (text) {
        var scores = {
                'A': 1,
                'B': 3,
                'C': 3,
                'D': 2,
                'E': 1,
                'F': 4,
                'G': 2,
                'H': 4,
                'I': 1,
                'J': 8,
                'K': 5,
                'L': 1,
                'M': 3,
                'N': 1,
                'O': 1,
                'P': 3,
                'Q': 10,
                'R': 1,
                'S': 1,
                'T': 1,
                'U': 1,
                'V': 4,
                'W': 4,
                'X': 8,
                'Y': 4,
                'Z': 10
            },
            sum = 0,
            i;
        if (text !== undefined) {
            text = text.toUpperCase();
            for (i = 0; i < text.length; i += 1) {
                sum += scores[text.charAt(i)] || 0;
            }
            return sum;
        } else {
            sum = 0;
            return sum;
        }
    };
});
