/**
 * Example of using techanjs in a node runtime environment
 */
var fs = require('fs');
var d3 = require('d3');
var techan = require('techan');
var chart = require('./chart');

var csvData = d3.csvParse(fs.readFileSync('./data.csv', { encoding: 'utf-8' }).trim());

var document = require('jsdom').jsdom();
// Create the chart, passing in runtime environment specific setup: node d3, techan and csv data
var body = d3.select(document.body).call(chart(d3, techan, csvData));

// Output result AVG
console.log('<?xml version="1.0" encoding="utf-8"?>');
console.log('<?xml-stylesheet type="text/css" href="chart.css" ?>');
console.log('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">');
console.log(body.html());