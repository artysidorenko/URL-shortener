'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var AutoIncrement = require('mongoose-sequence')(mongoose);
var dns = require ('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

/************************************/
/***************START****************/
/************************************/

// connect to mongodb and build schema

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true }, function (err) {
  if (err) console.log(err)
});
var Schema = mongoose.Schema;
var urlSchema = new Schema({
  original_url: {type: String, required: true}
});

urlSchema.plugin(AutoIncrement, {inc_field: 'id'});

// prepare Model and CRUD methods

var urlModel = mongoose.model('URL', urlSchema);

// add bodyParser to get req body
app.use(bodyParser.urlencoded({extended: false}));

// build POST route to add new urls
app.post("/api/shorturl/new", function (req, res) {
  
  let url = req.body.url;
  if ( url.match(/\/$/i)) url = url.slice(0,-1);
  
  const httpMatch = /^https?:\/\/(.*)/i;
  const matchResult = url.match(httpMatch);
  if (!matchResult) res.json({"error": "invalid syntax"})
  else {
    dns.lookup(matchResult[1], function(err) {
      if (err) res.json({"error": "unable to resolve hostname"})
      else {
        
        // url is valid: check if entry already exists
        urlModel.findOne({original_url: url}, function (err, result) {
          console.log('looking')
          console.log(result)
          if (err) {console.log(err); return};
          if (result !== null) res.json({
            original_url: result.original_url,
            short_url: result.id
          });
          
          //this means entry is new and should be saved
          else {
            console.log('creating new entry')
            var record = new urlModel({
              original_url: url
            });
            record.save(function (err2, newEntry) {
              if (err2) console.log(err2)
              else res.json({
                "original_url": newEntry.original_url,
                "short_url": newEntry.id
              })
            });
          }
        });
      }
    })
  }
  
});

// build GET method to redirect from short to long url
app.get("/api/shorturl/:id", function (req, res) {
  
  var id = req.params.id;
  urlModel.findOne({id: id}, function (err, result) {
    if (err) console.log(err)
    else if (result === null) res.json({"results": "null"})
    else res.redirect(result.original_url)
  });
  
})

/************************************/
/****************END*****************/
/************************************/

app.listen(port, function () {
  console.log('Node.js listening ...');
});