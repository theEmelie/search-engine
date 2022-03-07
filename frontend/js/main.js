document.getElementById("searchButton").addEventListener("click", function (e) {
    e.preventDefault();
    var queryData = document.getElementById("query").value;
    var url = 'http://localhost:3000/searchEngine?query=' + queryData;
    //console.log(iterations);{
    fetch(url, {
        method: 'get',
    })
    .then(response => response.json())
    .then(data => displaySearchTable(data));
});

function displaySearchTable(data) {
    console.log(data);

    var tBody = document.getElementById("search-table").getElementsByTagName("tbody")[0];
    var tHead = document.getElementById("search-table").getElementsByTagName("thead")[0];
    var keys = Object.keys(data.result[1]);

    var numOfRows = 5;
    //console.log(keys);
    //console.log(data);
   
    tBody.innerHTML = ""; // clear the table body
    tHead.innerHTML = ""; // clear the table head

    var row = tHead.insertRow(0);

    // iterate through all of the keys (headers) and add them onto the table.
    for (var i = 0; i < keys.length; i++) {
        var cell = document.createElement("th");
        var text = document.createTextNode(keys[i]);
        cell.appendChild(text);
        row.appendChild(cell);
    }

    // iterate through all of the rows a user has entered and insert them into the table.
    for (var i = 0; i < numOfRows; i++) {
        if (data.result[i] != null) {
            // add row into table with the movie title
            var row = tBody.insertRow(-1);
            //console.log(data[i]);
    
            for (var j = 0; j < keys.length; j++) {
                var cell = document.createElement("td");
                var text = document.createTextNode(data.result[i][keys[j]]);
                cell.appendChild(text);
                row.appendChild(cell);
            }
        }
    }
    var searchInfo = document.getElementById("search-info");

    searchInfo.innerHTML = "<p>Found " + data.numResult + " results in " + data.timeTaken + " sec</p>";


}
