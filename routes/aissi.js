var express = require('express');
var router = express.Router();

var geolib = require('geolib')
//
var ships={}
var numMessages = 0;
var msgPerMin = 0;

var numA = 0;
var numB = 0;
var numUnknown = 0;
var numAperMin = 0;
var numBperMin = 0;
var numUnknownperMin = 0;

var maxDist = 0;
var maxLastMinDist = 0;
var lastmaxship = {}
var mPerM = 1852;

var myLoc = {
	latitude: 60.16,
	longitude: 24.89
}

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send(ships);
});

router.get('/stats', function(req, res, next) {
	var result = "<pre>STATS: ";

	result += "num ships: " + Object.keys(ships).length
	result += " num messages: " + numMessages
	result += " num A msg: " + numA
	result += " num B msg. " + numB
	result += " num U msg: " + numUnknown
	result += "\n"
	result += " msg/min: " + msgPerMin
	result += " num A msg/min: " + numAperMin
        result += " num B msg/min: " + numBperMin
        result += " num U msg/min: " + numUnknownperMin

	result += "</pre>"

	res.send(result);
});

var perMinFunc = (function() {
 	var lastMsgCount = 0;
	var lastAcnt = 0;
	var lastBcnt = 0;
	var lastUcnt = 0;
        return function() {
                msgPerMin = numMessages - lastMsgCount;
                lastMsgCount = numMessages;

		numAperMin = numA - lastAcnt;
		lastAcnt = numA;

		numBperMin = numB - lastBcnt;
		lastBcnt = numB;

		numUnknownperMin = numUnknown - lastUcnt;
		lastUcnt = numUnknown;


		console.log(new Date().toLocaleString() + " total: " + numMessages + " a/min: " + numAperMin + " b/min: " + numBperMin 
			+ " maxDist: " + maxDist/mPerM + " max last M dist: " + maxLastMinDist/mPerM + " " + lastmaxship.mmsi + " " + lastmaxship.shipname );
		maxLastMinDist = 0;
        }

})();

setInterval( perMinFunc , 60*1000);

var AisEncode  = require ("ggencoder").AisEncode;
var NmeaEncode = require ("ggencoder").NmeaEncode;
var NmeaDecode = require ("ggencoder").NmeaDecode;
var AisDecode  = require ("ggencoder").AisDecode;

var session={}
var net = require('net');
var numberOfShips =0;

var client = new net.Socket();

client.setEncoding('ascii');
client.connect(8888, '127.0.0.1', function() {
	console.log('Connected');
});

client.on('data', function(data) {

	handlePacket(data);
});


function handlePacket(data) {

	var decMsg = new AisDecode(data, session);

//	console.log("                       " + data.trim());
	if (decMsg.valid) {
		numMessages++;
		session = {};

		var aistype = decMsg.aistype;
        	var mmsi = decMsg.mmsi;
	
		var repeat = decMsg.repeat;
		var newShip=" "
		var dist= 0;

		if(ships[mmsi] === undefined) {
			newShip='N'
               		ships[mmsi] = {};
			ships[mmsi].count = 0;
			numberOfShips++;
                }
                var ship = ships[mmsi];
		ship.repeat = repeat;
		ship.count++;
		ship.mmsi = mmsi;

		switch (aistype) {
			case 1:
			case 2:
			case 3:
				ship.class = decMsg.class;
				ship.navstatus = decMsg.navstatus;
				ship.longitude = decMsg.lon;
				ship.latitude = decMsg.lat;
				ship.sog = decMsg.sog;
				ship.cog = decMsg.cog;
				ship.hdg = decMsg.hdg;
				ship.utc = decMsg.utc;

				dist =  geolib.getDistance(myLoc, ship);

				break;
			case 18:
				ship.class = decMsg.class;
				ship.longitude = decMsg.lon;
                                ship.latitude = decMsg.lat;
                                ship.sog = decMsg.sog;
                                ship.cog = decMsg.cog;
                                ship.hdg = decMsg.hdg;
                                ship.utc = decMsg.utc;
				dist =  geolib.getDistance(myLoc, ship);
				break;
			case 5:
                                ship.class = decMsg.class;
				ship.imo = decMsg.imo;
                                ship.callsign = decMsg.cellsign;
				ship.shipname = decMsg.shipname;
				ship.destination = decMsg.destination;
				ship.cargo = decMsg.cargo
				break;
			case 24:
				 ship.class = decMsg.class;
				if(decMsg.part === 0 ) {
					ship.shipname = decMsg.shipname;
					ship.callsign = decMsg.cellsign;
				} else if (this.part === 1) {
                                	ship.cargo = decMsg.cargo
                                	ship.callsign = decMsg.cellsign;
				}
				break;
			default:
				console.log("AISTYPE: " + aistype);
				break;


		}

/*		 console.log (ship.mmsi + newShip + ship.class 
				+ " " + ship.count + " " + aistype 
				+ " " + ship.navstatus 
				+ " " + ship.shipname 
				+ " " + ship.destination 
				+ " " + ship.latitude 
				+ " " + ship.longitude); */
		if (ship.class == 'A') {
			numA++;
		} else if (ship.class == 'B') {
			numB++;
		} else {
			numUnknown++;
		}
		if (dist > maxDist ) {
			maxDist = dist;
			console.log("max Dist: " + dist/mPerM + " " + ship.mmsi + " " + ship.shipname);
		}
		if (dist > maxLastMinDist ) {
			maxLastMinDist = dist;
			lastmaxship = ship
			console.log("max Last m Dist: " + dist/mPerM + " " + ship.mmsi + " " + ship.shipname);
		}
//		console.log("a/min: " + numAperMin + " b/min: " + numBperMin);
	}
	else {
;//		console.log('invalid msg ' + decMsg.aistype + ' ' + data.trim());
	}

} 


module.exports = router;

