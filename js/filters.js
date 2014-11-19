/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
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
