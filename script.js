const COLOURS = [	"#bdcebe", "#F08080", "#20B2AA", "#4682B4", "#FFD700" ];
var colourInd = 0;
var buffer = [];
var currentQuote = {};

function openURL(url){
  window.open(url, 'Share', 'width=550, height=400, toolbar=0, scrollbars=1 ,location=0 ,statusbar=0,menubar=0, resizable=0');
}

function inIframe () { try { return window.self !== window.top; } catch (e) { return true; } }

function changeColour(){
  colourInd += 1;
  if (colourInd >= (COLOURS.length - 1)) {
    colourInd = 0;
  }
  $(".btn").css({
    "background-color": COLOURS[colourInd],
    "color": "#fff"
  });
  $("body").css({
    "background-color": COLOURS[colourInd],
    "color": COLOURS[colourInd]
  });
}




function getNewQuote(){
      console.log("Got to getting new quote");
      WikiquoteApi.queryRandomTitle(
         function(title) {
         WikiquoteApi.getRandomQuote(title, function(newQuote) {
          var validquote = testQuote(newQuote);
          if (validquote) {
            buffer.push([newQuote.titles,   newQuote.quote.replace(/<*>/gm, "")]);
          }
          else {
            console.log("trying again")
            getNewQuote();
          }
        }
      );},
      function(msg) {
        console.log(msg);
      });
  }

function render(){
      console.log("rendering")
      quoteDetails = buffer.shift()
      console.log(buffer)
      console.log(quoteDetails)
      currentQuote.title = quoteDetails[0];
      currentQuote.quote = (quoteDetails[1].charAt(0).toUpperCase() +         quoteDetails[1].slice(1));
       $("#quote").html(currentQuote.quote);
      $("#name").html("- " + currentQuote.title);
      changeColour();
      if(inIframe())
      {
        $("#tweet").attr('href', 'https://twitter.com/intent/tweet?hashtags=quotes&text=' + encodeURIComponent('"' + currentQuote.quote + '"' + currentQuote.title));
        $("#tweet").attr('target', 'blank');
        $('#tumblr').attr('href', 'https://www.tumblr.com/widgets/share/tool?posttype=quote&tags=quotes,freecodecamp&caption='+encodeURIComponent(currentQuote.title)+'&content=' + encodeURIComponent(currentQuote.quote)+'&canonicalUrl=https%3A%2F%2Fwww.tumblr.com%2Fbuttons&shareSource=tumblr_share_button');
        $("#tumblr").attr('target', 'blank');
      }
      
}

function testQuote(quote){
    console.log(quote);
    newQuote = quote.quote
    author = quote.titles
    return validInfo(newQuote, author)
  }

function validInfo (myQuote, myAuthor) {
  if (myAuthor && myQuote && /^[a-zA-Z]/.test(myQuote) && myQuote.length > 15 && myQuote.length < 200) {
    return true;
  }
  else {
    return false;
  }
}


function tweetThis(){
  
  
}

function tumblThis(){
  
  
}
//
// WikiquoteApi thanks to Nate Tyler. https://github.com/natetyler/wikiquotes-api
//
var WikiquoteApi = (function() {

  var wqa = {};

  var API_URL = "https://en.wikiquote.org/w/api.php";

  /**
   * Query based on "titles" parameter and return page id.
   * If multiple page ids are returned, choose the first one.
   * Query includes "redirects" option to automatically traverse redirects.
   * All words will be capitalized as this generally yields more consistent results.
   */
  wqa.queryTitles = function(titles, success, error) {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "query",
        redirects: "",
        titles: titles
      },

      success: function(result, status) {
        var pages = result.query.pages;
        var pageId = -1;
        for(var p in pages) {
          var page = pages[p];
          // api can return invalid recrods, these are marked as "missing"
          if(!("missing" in page)) {
            pageId = page.pageid;
            break;
          }
        }
        if(pageId > 0) {
          success(pageId);
        } else {
          error("No results");
        }
      },

      error: function(xhr, result, status){
        error("Error processing your query");
      }
    });
  };

  wqa.queryRandomTitle = function(success, error) {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "query",
        redirects: "",
        list: "random",
        rnnamespace: "0"
      },

      success: function(result, status) {
        var title = result.query.random[0].title;
        if(title !== undefined) {
          success(title);
        } else {
          error("No results");
        }
      },

      error: function(xhr, result, status){
        error("Error processing your query");
      }
    });
  };
  /**
   * Get the sections for a given page.
   * This makes parsing for quotes more manageable.
   * Returns an array of all "1.x" sections as these usually contain the quotes.
   * If no 1.x sections exists, returns section 1. Returns the titles that were used
   * in case there is a redirect.
   */
  wqa.getSectionsForPage = function(pageId, success, error) {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "parse",
        prop: "sections",
        pageid: pageId
      },

      success: function(result, status){
        var sectionArray = [];
        var sections = result.parse.sections;
        for(var s in sections) {
          var splitNum = sections[s].number.split('.');
          if(splitNum.length > 1 && splitNum[0] === "1") {
            sectionArray.push(sections[s].index);
          }
        }
        // Use section 1 if there are no "1.x" sections
        if(sectionArray.length === 0) {
          sectionArray.push("1");
        }
        success({ titles: result.parse.title, sections: sectionArray });
      },
      error: function(xhr, result, status){
        error("Error getting sections");
      }
    });
  };

  /**
   * Get all quotes for a given section.  Most sections will be of the format:
   * <h3> title </h3>
   * <ul>
   *   <li> 
   *     Quote text
   *     <ul>
   *       <li> additional info on the quote </li>
   *     </ul>
   *   </li>
   * <ul>
   * <ul> next quote etc... </ul>
   *
   * The quote may or may not contain sections inside <b /> tags.
   *
   * For quotes with bold sections, only the bold part is returned for brevity
   * (usually the bold part is more well known).
   * Otherwise the entire text is returned.  Returns the titles that were used
   * in case there is a redirect.
   */
  wqa.getQuotesForSection = function(pageId, sectionIndex, success, error) {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "parse",
        noimages: "",
        pageid: pageId,
        section: sectionIndex
      },

      success: function(result, status){
        if (result.parse) {
          var quotes = result.parse.text["*"];
          var quoteArray = []

          // Find top level <li> only
          var $lis = $(quotes).find('li:not(li li)');
          $lis.each(function() {
            // Remove all children that aren't <b>
            $(this).children().remove(':not(b)');
            var $bolds = $(this).find('b');

            // If the section has bold text, use it.  Otherwise pull the plain text.
            if($bolds.length > 0) {
              quoteArray.push($bolds.html());
            } else {
              quoteArray.push($(this).html());
            }
          });
          success({ titles: result.parse.title, quotes: quoteArray });}
        else {
          getNewQuote()
        }
      },
      error: function(xhr, result, status){
        error("Error getting quotes");
      }
    });
  };
  
  /**
   * Get Wikipedia page for specific section
   * Usually section 0 includes personal Wikipedia page link
   */
  wqa.getWikiForSection = function(title, pageId, sec, success, error) {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "parse",
        noimages: "",
        pageid: pageId,
        section: sec
      },

      success: function(result, status){
		
        var wikilink;
		console.log('what is iwlink:'+result.parse.iwlinks);
		var iwl = result.parse.iwlinks;
		for(var i=0; i<(iwl).length; i++){
			var obj = iwl[i];
			if((obj["*"]).indexOf(title) != -1){
				 wikilink = obj.url;
			}
		}
        success(wikilink);
      },
      error: function(xhr, result, status){
        error("Error getting quotes");
      }
    });
  };
  /**
   * Search using opensearch api.  Returns an array of search results.
   */
  wqa.openSearch = function(titles, success, error) {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "opensearch",
        namespace: 0,
        suggest: "",
        search: titles
      },

      success: function(result, status){
        success(result[1]);
      },
      error: function(xhr, result, status){
        error("Error with opensearch for " + titles);
      }
    });
  };

  /**
   * Get a random quote for the given title search.
   * This function searches for a page id for the given title, chooses a random
   * section from the list of sections for the page, and then chooses a random
   * quote from that section.  Returns the titles that were used in case there
   * is a redirect.
   */
    wqa.getRandomQuote = function(titles, success, error) {

    var errorFunction = function(msg) {
      error(msg);
    };

    var chooseQuote = function(quotes) {
      var randomNum = Math.floor(Math.random()*quotes.quotes.length);
      success({ titles: quotes.titles, quote: quotes.quotes[randomNum] });
    };

    var getQuotes = function(pageId, sections) {
      var randomNum = Math.floor(Math.random()*sections.sections.length);
      wqa.getQuotesForSection(pageId, sections.sections[randomNum], chooseQuote, errorFunction);
    };

    var getSections = function(pageId) {
      wqa.getSectionsForPage(pageId, function(sections) { getQuotes(pageId, sections); }, errorFunction);
    };

    wqa.queryTitles(titles, getSections, errorFunction);
  };

  /**
   * Capitalize the first letter of each word
   */
  wqa.capitalizeString = function(input) {
    var inputArray = input.split(' ');
    var output = [];
    for(s in inputArray) {
      output.push(inputArray[s].charAt(0).toUpperCase() + inputArray[s].slice(1));
    }
    return output.join(' ');
  };

  return wqa;
}());
  
$(document).ready(function(){
  
 function bufferQuotes(){
   for (var i = 0; i < 10; i++) { 
      getNewQuote();
     } 
  } 

 async function getFirstQuote() {
  bufferQuotes();
  setTimeout(render,3000)
 } 
  
  
  
  $("#new-quote").click(function() {
    render();
    getNewQuote();
  });

  
  $('#tweet').on('click', function() {
    if(!inIframe()) {
      openURL('https://twitter.com/intent/tweet?hashtags=quotes&related=freecodecamp&text=' + encodeURIComponent('"' + currentQuote.quote + '" ' + currentQuote.title));
    }
  });
  $('#tumblr').on('click', function() {
    if(!inIframe()) {
      openURL('https://www.tumblr.com/widgets/share/tool?posttype=quote&tags=quotes,freecodecamp&caption='+encodeURIComponent(currentQuote.title)+'&content=' + encodeURIComponent(currentQuote.quote)+'&canonicalUrl=https%3A%2F%2Fwww.tumblr.com%2Fbuttons&shareSource=tumblr_share_button');
    }
  });
   
  getFirstQuote();
});