"use strict";

const lastdata = {
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
	aggregate: 1,
	minute: {
		url: 'histominute',
		limit: 720 // (12 * 60)
	},
	hour: {
		url: 'histohour',
		limit: 168 // (7 * 24)
	},
	day: {
		url: 'histoday',
		limit: 180 // (6 * 30)
	}
};

const margin = { top: 20, right: 50, bottom: 30, left: 80 };
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;


const _ = (id) => document.getElementById(id)

function getResolution (prmstr) {
	switch (prmstr.res) {
		case 'minute':
			return defparam.minute;
		case 'hour':
			return defparam.hour;
		case 'day':
			return defparam.day;
		default:
			return defparam.minute;
	}
}

const timeAgo = (timestamp, locale = 'en') => {
	let value;
	const diff = (new Date().getTime() - timestamp.getTime()) / 1000;
	const minutes = Math.floor(diff / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const months = Math.floor(days / 30);
	const years = Math.floor(months / 12);
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

	if (years > 0) {
		value = rtf.format(0 - years, "year");
	} else if (months > 0) {
		value = rtf.format(0 - months, "month");
	} else if (days > 0) {
		value = rtf.format(0 - days, "day");
	} else if (hours > 0) {
		value = rtf.format(0 - hours, "hour");
	} else if (minutes > 0) {
		value = rtf.format(0 - minutes, "minute");
	} else {
		value = rtf.format(0 - diff, "second");
	}
	return value;
}

function checkParams (paramobj) {
	const { url, limit } = getResolution(paramobj);

	paramobj.resurl = url;
	paramobj.agg = (paramobj.agg ? paramobj.agg : defparam.aggregate);
	paramobj.e = (paramobj.e ? paramobj.e : defparam.exchange);
	paramobj.currency = (paramobj.currency ? paramobj.currency : defparam.currency);
	paramobj.crypto = (paramobj.crypto ? paramobj.crypto : defparam.crypto);
	paramobj.limit = (paramobj.limit ? paramobj.limit : limit);

	return paramobj;
}

function getURL (paramobj) {
	let url = defparam.dataurl + paramobj.resurl;
	//	url += '?e=' + paramobj.e;
	url += `?fsym=${paramobj.currency}`;
	url += `&tsym=${paramobj.crypto}`;
	url += `&limit=${paramobj.limit}`;
	url += `&aggregate=${paramobj.agg}`;
	return url;
}

function getSearchParameters () {
	const url = new URL(window.location)
	const searchParams = new URLSearchParams(url.search)
	const paramObj = {}
	for (const key of searchParams.keys()) {
		paramObj[key] = searchParams.getAll(key).length > 1
			? searchParams.getAll(key)
			: searchParams.get(key);
	}
	return paramObj
}

function getReadableHashRateString (hashrate) {
	let i = 0;
	const byteUnits = [' H', ' KH', ' MH', ' GH', ' TH', ' PH'];
	while (hashrate > 1000) {
		hashrate /= 1000;
		i++;
	}
	return hashrate.toFixed(2) + byteUnits[i];
}
