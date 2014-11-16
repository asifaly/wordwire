/**
 * Created by asifa on 11/6/2014.
 */
var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter',
    function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter) {
        //initialize pattern if it is not done, when app initializes, there is an error for invalid pattern
        $scope.stats = {};
        $scope.stats.pattern = new RegExp();
        //initialize values
        $scope.newword = {
            name: '',
            score: ''
        };

        //defining firebase instances
        var wRef = new Firebase(FIREBASE_URI + "/words"),
            wordRef = $firebase(wRef.limitToLast(5)).$asArray(),
            sRef = new Firebase(FIREBASE_URI + "/stats"),
            statRef = $firebase(sRef); //can define $set only if it is not defined as Object or Array

        //watch for change in value of lastWord, firstLetter and pattern and update the scope
        sRef.on("value", function (statssnapshot) {
            $timeout(function () {
                $scope.stats = statssnapshot.val(); //get value of firebase/stats
                $scope.stats.pattern = $filter('strtoregex')(statssnapshot.val().pattern); //using filter to convert string to regex
            });
        });

        var presenceRef = new Firebase('https://wordwire.firebaseio.com/stats/disconnectmessage');
        // Write a string when this client loses connection
        presenceRef.onDisconnect().set("I disconnected!");

        //load last 5 values of words and scores from firebase
        wordRef.$loaded().then(function (wordlist) {
            //load data to words on promise
            $scope.words = wordlist;

            //this function is called on clicking the submit button
            $scope.addWord = function () {
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

                //check if the word entered is a valid english word
                dictRef.orderByKey().startAt(dictCheck).endAt(dictCheck).on("value", function (snapshot) {
                    //if the word exists in the dictionary, i.e not equal to null
                    if (snapshot.val() !== null) {
                        //check if the word already exists in firebase
                        wRef.orderByChild("name").equalTo(lastWord).once("value", function (snapshot) {
                            if (snapshot.val() !== null) { //if word exists in firebase
                                $window.alert("word already exists chose another");
                            } else { //if does not exist in firebase, add it
                                wordRef.$add(angular.copy($scope.newword)).then(function (nref) {
                                    var wid = nref.key();
                                    console.log("newword added successfully" + wid);
                                });
                                $timeout(function () { //update lastWord, firstLetter and patten based on newword
                                    statRef.$set({
                                            firstletter: firstLetter,
                                            lastword: lastWord,
                                            pattern: pattern
                                    }).then(function () {
                                            $scope.stats.pattern = $filter('strtoregex')(pattern);
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
        });

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
        if (text !== undefined) {
            text = text.toUpperCase();
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
                sum = 0;

            for (var i = 0; i < text.length; ++i) {
                sum += scores[text.charAt(i)] || 0;
            }
            return sum;
        } else {
            sum = 0;
            return sum;
        }
    };
});

