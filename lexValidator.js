'use strict';

var request = require("request")
var googleAPIKey = process.env.GOOGLE_API_KEY
module.exports.handler = (event, context, callback) => {
    dispatch(event, (err, response) => {
        if(err){
            return callback(err)
        }

        callback(null, response)
    })
    console.log(JSON.stringify(event))
    console.log(JSON.stringify(context))
};


function dispatch(intentRequest, callback){
    var clinicType = intentRequest.currentIntent.slots.ClinicType
    var location = intentRequest.currentIntent.slots.Location

    if(!clinicType && !location){
        return callback(null, {
            sessionAttributes: {},
            dialogAction: {
                type: "Delegate",
                slots: intentRequest.currentIntent.slots
            }
        })
    }else if(location && !intentRequest.sessionAttributes.location){
        var urlFriendilyLocation = location.replace(/ /g, "+")
        var url = `https://maps.googleapis.com/maps/api/geocode/json?address=${urlFriendilyLocation}&key=${googleAPIKey}`

        console.log("Looking for coordinates of " + location)
        request.get(url, function(err, r, body){
            if(err) return callback(err)
            console.log(url)
            console.log(body)
            body = JSON.parse(body)
            if(body.results && body.results.length && body.results.length > 0){
                location = body.results[0].geometry.location

                url = `https://gsw8v2kfo6.execute-api.ap-southeast-2.amazonaws.com/dev/clinics/list/${location.lat}/${location.lng}/10000`
                console.log("Looking for clinics around location of " + location)
                request.get(url, function(err, r, body){
                    if(err) return callback(err)
                    console.log(body)
                    body = JSON.parse(body)
                    if(body.length && body.length > 0){
                        var successMessage = `There are ${body.length} clinics you can choose from, they are `
                        for(var i = 0; i < body.length; ++i){
                            successMessage += body[i].name
                            if(i != body.length - 1){
                                successMessage += ", "
                            }
                        }
                        console.log("Found clinics")
                        successMessage += " respectively"

                        return callback(null, {
                            sessionAttributes: {},
                            dialogAction: {
                                "type": "Close",
                                "fulfillmentState": "Fulfilled",
                                "message": {
                                    "contentType": "PlainText",
                                    "content": successMessage
                                }
                            }
                        })
                    }else{
                        console.log("Didn't found any clinics")
                        return callback(null, {
                            sessionAttributes: {},
                            dialogAction: {
                                "type": "Close",
                                "fulfillmentState": "Fulfilled",
                                "message": {
                                    "contentType": "PlainText",
                                    "content": "Sorry, the location you provided has no clinics around"
                                }
                            }
                        })
                    }
                })

            }else{
                return callback(null, {
                    sessionAttributes: {},
                    dialogAction: {
                        "type": "ElicitSlot",
                        "message": {
                            "contentType": "PlainText",
                            "content": "Sorry, the location you provided is invalid. Could you provide your location again?"
                        },
                        "intentName": intentRequest.currentIntent.name,
                        "slots": intentRequest.currentIntent.slots,
                        "slotToElicit": "Location"
                    }
                })
            }
        })

    }else{
        return callback(null, {
            sessionAttributes: {},
            dialogAction: {
                type: "Delegate",
                slots: intentRequest.currentIntent.slots
            }
        })
    }
}