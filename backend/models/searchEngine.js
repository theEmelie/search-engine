const fs = require('fs');
const { performance } = require('perf_hooks');

const searchEngine = {
    // Using Map instead of Object (Object was 1000x slower, 500s to index compared to half a second for a map)
    pageDB: {wordToId: new Map(), pages: []},

    /**
     * Iterate through all the folders and files, 
     * and call indexPage with all the files.
     */
    buildIndex: function() {
        var wikiWordsFolder = '../backend/wikipedia/Words';
        var folders = fs.readdirSync(wikiWordsFolder);
        console.time("buildIndex time");
        
        // Iterate through all folders and read them
        for (var i = 0; i < folders.length; i++) {
            var folderName = '../backend/wikipedia/Words/' + folders[i];
            var files = fs.readdirSync(folderName);
            // Iterate through all the files and read them
            for (var j = 0; j < files.length; j++) {
                var fileName = folderName + "/" + files[j]
                var pageData = fs.readFileSync(fileName, 'utf8');
                var url = "/" + folders[i] + "/" + files[j];
                
                searchEngine.indexPage(pageData, url);
                //console.log(this.pageDB.wordToId);
                //console.log(this.pageDB.pages);
            }
        }
        console.timeEnd("buildIndex time");
        //console.log(this.pageDB.wordToId);
        console.log(this.pageDB.pages);
    },
    /**
     * Iterate through all the words in a page and push the id onto an object.
     * @param {pageData} pageData 
     * @param {url} url 
     */
    indexPage: function(pageData, url) {
        var pageWords = pageData.split(" ");
        var pageObj = new Object();
        var words = [];
       
        pageObj.url = url;

        // Iterate through all the words in page
        for (var i = 0; i < pageWords.length; i++) {
            // Get id for word and push it
            var id = searchEngine.getIdForWord(pageWords[i]);
            words.push(id);
        }
        pageObj.word = words;
        this.pageDB.pages.push(pageObj);
    },
    /**
     * Get id for a word
     * @param {word} word 
     * @returns the id for the word
     */
    getIdForWord: function(word) {
        if (this.pageDB.wordToId.has(word)) {
            // Word found in map
            return this.pageDB.wordToId.get(word);
        } else {
            // Add missing word to map
            var id = this.pageDB.wordToId.size;
            this.pageDB.wordToId.set(word, id);
            return id;
        }
    },
    /**
     * Main function that calls various functions to get the final result, 
     * which then get sorted and sends a JSON output.
     * @param {res} res 
     * @param {req} req 
     * @returns the final output from the search
     */
    query: function(res, req) {
        console.time("query time");
        const start = performance.now();
        var result = [];
        var contentScore = [];
        var locationScore = [];
        var query = req.query.query;
        var output = {};
        // Calculate score for each page in the pages database
        for (var i = 0; i < this.pageDB.pages.length; i++) {
            contentScore[i]  = searchEngine.getFrequencyScore(this.pageDB.pages[i], query);
            locationScore[i] = searchEngine.getLocationScore(this.pageDB.pages[i], query);
        }
        // Normalize scores
        contentScore  = searchEngine.normalize(contentScore, false);
        locationScore = searchEngine.normalize(locationScore, true);
        
        // Generate result list
        for (var i = 0; i < this.pageDB.pages.length; i++) {
            // Only include results where the word appears at least once
            if (contentScore[i] > 0) {
                // Calculate sum of weighted scores
                var weightedLocationScore = locationScore[i] * 0.8; 
                var overallScore = contentScore[i] + weightedLocationScore;
                result.push({Link: this.pageDB.pages[i].url, Score: overallScore, Content: contentScore[i], Location: weightedLocationScore, PageRank: 0.00});
            }
        }
        // Sort result list with highest score first
        result.sort((a, b) => (a.Score < b.Score) ? 1 : ((b.Score < a.Score) ? -1 : 0));
        roundedResult = searchEngine.roundResult(result);
        // Return result list
        // console.log("result");
        // console.log(result);
        const end = performance.now();
        console.timeEnd("query time");

        output.result = roundedResult;
        output.numResult = roundedResult.length;
        output.timeTaken = ((end - start) / 1000).toFixed(3);
        return res.status(200).send(JSON.stringify(output));
    },
    /**
     * Set the score for the word frequency.
     * @param {page} page 
     * @param {query} query 
     * @returns 
     */
    getFrequencyScore: function(page, query) {
        var qws = [];
        var score = 0;
        // Split search query to get each word
        qws = query.split(" ");
        // Iterate over each word in the search query
        for (var i = 0; i < qws.length; i++) {
            //console.log("qws: " + i);
            var q = searchEngine.lookupWordId(qws[i]);
            // Iterate over all words in the page
            for (var j = 0; j < page.word.length; j++) {
                //console.log("page word: " + j)
                // Increase score by one if the page word matches
                if (page.word[j] == q) {
                    score += 1;
                }
            }
        }
        // Return the score
        return score;
    },
    /**
     * Look if the word id exists for the word.
     * @param {word} word 
     * @returns the word id if word is found or -1 if it is not found.
     */
    lookupWordId: function(word) {
        if (this.pageDB.wordToId.has(word)) {
            // Word found in map
            return this.pageDB.wordToId.get(word);
        } else {
            return -1;
        }
    },
    /**
     * Get the normalization score between 0 and 1.
     * @param {scores} scores 
     * @param {smallIsBetter} smallIsBetter 
     * @returns 
     */
    normalize: function(scores, smallIsBetter) {
        if (smallIsBetter) {
            //Smaller values shall be inverted to higher values
            //and scaled between 0 and 1
            //Find min value in the array
            minVal = Math.min(...scores);
            //Divide the min value by the score
            //(and avoid division by zero)
            for (var i = 0; i < scores.length; i++) {
                scores[i] = minVal / Math.max(scores[i], 0.00001);
            }
        } else {
            // Higher values shall be scaled between 0 and 1
            // Find max value in the array
            var maxVal = Math.max(...scores);
            // To avoid division by zero
            maxVal = Math.max(maxVal, 0.00001);

            // When we have a max value, divide all scores by it
            for (var i = 0; i < scores.length; i++) {
                scores[i] = scores[i] / maxVal;
            }
        }
        return scores;
    },
    /**
     * Set the score for the location
     * @param {page} page 
     * @param {query} query 
     * @returns the score
     */
    getLocationScore: function(page, query) {
        var qws = [];
        var score = 0;
        // Split search query to get each word
        qws = query.split(" ");
        //Iterate over each word in the search query
        for (var i = 0; i < qws.length; i++) {
            var found = false;
            var q = searchEngine.lookupWordId(qws[i]);
            // Iterate over all words in the page
            for (var j = 0; j < page.word.length; j++) {
                // Score is the index of the first occurence of the
                // word + 1 (to avoid zero scores)
                if (page.word[j] == q) {
                    score += j + 1;
                    // Stop once the word has been found
                    found = true;
                    break;
                }
            }
            // If the word is not found on the page, increase
            // the score by a high value
            if (!found) {
                score += 100000;
            }
        }
        // Return the score
        return score;
    },
    /**
     * Round each element of the array into two decimals.
     * @param {result} result 
     * @returns the result rounded to two decimals
     */
    roundResult: function(result) {
        for (var i = 0; i < result.length; i++) {
            result[i].Score = result[i].Score.toFixed(2);
            result[i].Content = result[i].Content.toFixed(2);
            result[i].Location = result[i].Location.toFixed(2);
            result[i].PageRank = result[i].PageRank.toFixed(2);
        }
        return result;
    }
}

module.exports = searchEngine;