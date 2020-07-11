"use strict";

var lastdata = {
	time: 0,
	volume: 0,
	open: 0,
	high: 0,
	low: 0,
	close: 0
};

const defparam = {
	dataurl: "https://min-api.cryptocompare.com/data/",
	symbol: {
		EUR: "€",
		USD: "$",
	},
	exchange: 'Kraken',
	crypto: 'XMR',
	currency: 'EUR',
	resolution: 15,
	minute : {
					url: 'histominute',
					limit: 720 // (12 * 60)
	},
	hour : {
					url: 'histohour',
					limit: 168 // (7 * 24)
	},
	day  : {
					url: 'histoday',
					limit: 180 // (6 * 30)
	}
};

const margin = {top: 20, right: 50, bottom: 30, left: 80},
		width = 600 - margin.left - margin.right,
		height = 400 - margin.top - margin.bottom;


function _(id) {
	return document.getElementById(id);
}

function getResolution(prmstr) {
	let res = {};
	switch(prmstr.res) {
		case 'minute':
			res = defparam.minute;
			break;
		case 'hour':
			res = defparam.hour;
			break;
		case 'day':
			res = defparam.day;
			break;
		default:
			res = defparam.minute;
	}
	return res;
}

function checkParams(paramobj) {
	const { url, limit } = getResolution(paramobj);

	paramobj.resurl = url;
	paramobj.resolution = ( paramobj.resolution ? paramobj.resolution : defparam.resolution );
	paramobj.e = ( paramobj.e ? paramobj.e : defparam.exchange );
	paramobj.currency = ( paramobj.currency ? paramobj.currency : defparam.currency );
	paramobj.crypto = ( paramobj.crypto ? paramobj.crypto : defparam.crypto );
	paramobj.limit = ( paramobj.limit ? paramobj.limit : limit );

	return paramobj;
}

function getURL(paramobj) {
	let url = defparam.dataurl + paramobj.resurl;
//	url += '?e=' + paramobj.e;
	url += '?fsym=' + paramobj.currency;
	url += '&tsym=' + paramobj.crypto;
	url += '&limit=' + paramobj.limit;

	return url;
}

function getSearchParameters() {
		let paramstr = window.location.search.substr(1);
	  return paramstr != null && paramstr != "" ? transformToAssocArray(paramstr) : {};
}

function transformToAssocArray( prmstr ) {
	let params = {};
	let prmarr = prmstr.split("&");
	for ( let i = 0; i < prmarr.length; i++) {
		let tmparr = prmarr[i].split("=");
		params[tmparr[0]] = tmparr[1];
	}
	return params;
}

function getReadableHashRateString(hashrate){
	var i = 0;
	var byteUnits = [' H', ' KH', ' MH', ' GH', ' TH', ' PH' ];
	while (hashrate > 1000){
		hashrate = hashrate / 1000;
		i++;
	}
	return hashrate.toFixed(2) + byteUnits[i];
}
