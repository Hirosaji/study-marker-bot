// -----------------------------------------------------------------------------
// 定数の設定
const LINE_CHANNEL_ACCESS_TOKEN = 'Your_Access_Token';

// -----------------------------------------------------------------------------
// モジュールのインポート
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var mecab = require('mecabaas-client');
var AWS = require('aws-sdk');
var app = express();

// -----------------------------------------------------------------------------
// ミドルウェア設定
app.use(bodyParser.json());

// -----------------------------------------------------------------------------
// Webサーバー設定
var port = (process.env.PORT || 3000);
var server = app.listen(port, function() {
    console.log('Node is running on port ' + port);
});

// -----------------------------------------------------------------------------
// AWSの設定
AWS.config.loadFromPath('./credentials.json'); // AWSのアカウント情報とリージョンを設定
var s3 = new AWS.S3();
var bucketName = 'study-marker';
var keyName = 'logData.json';

// -----------------------------------------------------------------------------
// 定時PUSH設定
app.get('/push', function(req, res, next){
	// 管理用JSONをS3からダウンロード
	var params = {Bucket: bucketName, Key: keyName};
	s3.getObject(params, function(err, data) {
	    if (err) {
	        console.log(err, err.stack);
	    } else {
	        // 管理用JSONの整形
	        var object = JSON.parse(data.Body.toString());
	        var objectLen = object.logData.length;
	        // LINE BOTにPUSHするパラメータを設定
	        var headers = {
	            'Content-Type': 'application/json',
	            'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
	        }
			var pushURL = 'https://api.line.me/v2/bot/message/push';

			// ターゲットユーザーとそのライバル関係のユーザの情報を入力
			for(var i=0; i<objectLen; i++){
				if( object.logData[i].userID == "Target_Line_ID"){
					var TargetLastLen = object.logData[i].period.length;
					var TargetLastTime = [0,0,0];
					for(var j=0; j<TargetLastLen; j++){
						var TargetLastTime = dataSum(TargetLastTime, object.logData[i].period[j]);
					}
					TargetLastTimeText = TargetLastTime[0]+"時間"+TargetLastTime[1]+"分"+TargetLastTime[2]+"秒";
		        	object.logData[i].period = [[0,0,0]];
				} else if( object.logData[i].userID == "Rival_Line_ID"){
					var RivalLastLen = object.logData[i].period.length;
					var RivalLastTime = [0,0,0];
					for(var j=0; j<RivalLastLen; j++){
						var RivalLastTime = dataSum(RivalLastTime, object.logData[i].period[j]);
					}
					RivalLastTimeText = RivalLastTime[0]+"時間"+RivalLastTime[1]+"分"+RivalLastTime[2]+"秒";
		        	object.logData[i].period = [[0,0,0]];
				};
			}
	        var body = {
	            "to": "Target_Line_ID",
	            messages: [{
	                type: 'text',
	                text: '１日お疲れ様でした！\n今日は合計「'+TargetLastTimeText+'」勉強しましたね。'
	            },{
	                type: 'text',
	                text: 'あなたと成績の近い〇〇さんは今日、「'+RivalLastTimeText+'」勉強していましたよ。'
	            },{
	                type: 'text',
	                text: '明日も頑張りましょう！'
	            }]
	        }
	        request({
	            url: pushURL,
	            method: 'POST',
	            headers: headers,
	            body: body1,
	            json: true
	        });

	        // リセットしたJSONをS3にアップロード
        	var obj = JSON.stringify(object);
        	var params = {Bucket: bucketName, Key: keyName, Body: obj};
        	s3.putObject(params, function(err, data) {
			    if (err) { console.log(err, err.stack); };
		    });
        };
    });
});

// -----------------------------------------------------------------------------
// webhook設定
app.post('/webhook', function(req, res, next){
    res.status(200).end();

    // ユーザ情報を取得
    var user_id = req.body['events'][0]['source']['userId'];
    var get_profile_options = {
        url: 'https://api.line.me/v2/bot/profile/' + user_id,
        proxy: process.env.FIXIE_URL,
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
        }
    }

    // ユーザ情報をコンソールに表示
    console.log("userID: " + req.body['events'][0]['source']['userId']);
    request.get(get_profile_options, function(error, response, body) {
        userName = body['displayName'];
        console.log("ユーザ名: " + userName);
    });

	// ログ管理用JSONを取得
	var params = {Bucket: bucketName, Key: keyName};
	s3.getObject(params, function(err, data) {
	    if (err) {
	        console.log(err, err.stack);
	    } else {
	        var object = JSON.parse(data.Body.toString());
	        var objectLen = object.logData.length;
	        var thisUserID = req.body['events'][0]['source']['userId'];
	        var unixTimestamp = req.body['events'][0]['timestamp']/1000;
	        var nowTime = ts2date(unixTimestamp);
	        var actualTime;
	        console.log(unixTimestamp);
	        console.log(nowTime);

            /*
            	< 適宜必要な内部情報 >
	            	// userID
					req.body['events'][0]['source']['userId']
					// タイムスタンプ
					req.body['events'][0]['timestamp']
            */

		    // メッセージ内容の設定
		    for (var event of req.body.events){
		    	// テスト用
		        if (event.type == 'message' && event.message.text == '食べないでください！'){
		            var headers = {
		                'Content-Type': 'application/json',
		                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
		            }
		            var body = {
		                replyToken: event.replyToken,
		                messages: [{
		                    type: 'text',
		                    text: '食べないよ！'
		                }]
		            }
		            var url = 'https://api.line.me/v2/bot/message/reply';
		            request({
		                url: url,
		                method: 'POST',
		                headers: headers,
		                body: body,
		                json: true
		            });
		        }

		        // 実験用
		        if (event.type == 'message' && event.message.text == '勉強を開始します'){
		            var headers = {
		                'Content-Type': 'application/json',
		                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
		            }
		            var url = 'https://api.line.me/v2/bot/message/reply';
	            	loop1: for(var i=0; i<objectLen; i++){
	            		if (object.logData[i].userID == thisUserID){
	            			if(object.logData[i].lastCommand[0]=="rest" || object.logData[i].lastCommand[0]=="restart"){
					            var body2 = {
					                replyToken: event.replyToken,
					                messages: [{
					                    type: 'text',
					                    text: 'おや？\n前回の学習が終了できていないようです。\n先に「勉強終了」を押してください。'
					                }]
					            }
					            request({
					                url: url,
					                method: 'POST',
					                headers: headers,
					                body: body2,
					                json: true
					            });
					            continue loop1;
	            			} else if(object.logData[i].lastCommand[0]=="start"){
					            var body2 = {
					                replyToken: event.replyToken,
					                messages: [{
					                    type: 'text',
					                    text: 'おや？\nすでに「勉強開始」が押されていますよ。'
					                }]
					            }
					            request({
					                url: url,
					                method: 'POST',
					                headers: headers,
					                body: body2,
					                json: true
					            });
					            continue loop1;
	            			} else {
		            			object.logData[i].start[0] = nowTime[0];
		            			object.logData[i].start[1] = nowTime[1];
		            			object.logData[i].start[2] = nowTime[2];
		            			object.logData[i].lastCommand[0] = "start";
	            			};
	            		};
	            	};
	            	var obj = JSON.stringify(object);
	            	var params = {Bucket: bucketName, Key: keyName, Body: obj};
	            	s3.putObject(params, function(err, data) {
					    if (err) { console.log(err, err.stack); };
				    });
				    request.get(get_profile_options, function(error, response, body) {
				        userName = body['displayName'];
			            var body = {
			                replyToken: event.replyToken,
			                messages: [{
			                    type: 'text',
			                    text: 'そうですか。\n' + userName + 'さん、頑張ってくださいね！'
			                }]
			            }
			            request({
			                url: url,
			                method: 'POST',
			                headers: headers,
			                body: body,
			                json: true
			            });
		            });
		        }
		        else if (event.type == 'message' && event.message.text == '勉強を終了します'){
		            var headers = {
		                'Content-Type': 'application/json',
		                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
		            }
		            var url = 'https://api.line.me/v2/bot/message/reply';
	            	loop2: for(var i=0; i<objectLen; i++){
	            		if (object.logData[i].userID == thisUserID){
	            			if(object.logData[i].lastCommand[0]=="rest"){
					            var body2 = {
					                replyToken: event.replyToken,
					                messages: [{
					                    type: 'text',
					                    text: 'おや？\n前回の休憩が終了できていないようです。\n先に「勉強再開」を押してください。'
					                }]
					            };
					            request({
					                url: url,
					                method: 'POST',
					                headers: headers,
					                body: body2,
					                json: true
					            });
					            continue loop2;
	            			} else if(object.logData[i].lastCommand[0]=="end"){
					            var body2 = {
					                replyToken: event.replyToken,
					                messages: [{
					                    type: 'text',
					                    text: '連続で「勉強終了」を押さないでください！'
					                }]
					            };
					            request({
					                url: url,
					                method: 'POST',
					                headers: headers,
					                body: body2,
					                json: true
					            });
					            continue loop2;
	            			} else {
		            			var totalRest = [0,0,0];
		            			console.log("num: " + object.logData[i].restart.length)
		            			for(var j=0; j<object.logData[i].restart.length; j++){
		            				var difference = dataDifference(object.logData[i].restart[j], object.logData[i].rest[j]);
		            				totalRest = dataSum(totalRest, difference);
		            			}
		            			var totalTime = dataDifference(nowTime, object.logData[i].start);
		            			var actualPeriod = dataDifference(totalTime, totalRest);
		            			object.logData[i].period.push(actualPeriod);
		            			object.logData[i].storeLog.date.push(unixTimestamp);
		            			object.logData[i].storeLog.period.push(actualPeriod);
		            			object.logData[i].start = [0,0,0];
		            			object.logData[i].rest = [[0,0,0]];
		            			object.logData[i].restart = [[0,0,0]];
		            			object.logData[i].lastCommand[0] = "end";
		            			var periodLen = object.logData[i].period.length;
		            			actualTime = object.logData[i].period[periodLen-1][0]+"時間"+object.logData[i].period[periodLen-1][1]+"分"+object.logData[i].period[periodLen-1][2]+"秒";
	            			};
	            		};
	            	};
	            	var obj = JSON.stringify(object);
	            	var params = {Bucket: bucketName, Key: keyName, Body: obj};
	            	s3.putObject(params, function(err, data) {
					    if (err) { console.log(err, err.stack); };
				    });
				    request.get(get_profile_options, function(error, response, body) {
				        userName = body['displayName'];
			            var body = {
			                replyToken: event.replyToken,
			                messages: [{
			                    type: 'text',
			                    text: 'お疲れ様でした！'
			                },{
			                    type: 'text',
			                    text: '今回の' + userName + 'さんの勉強時間は「' + actualTime + '」でした。\n頑張りましたね。'
			                }]
			            }
			            request({
			                url: url,
			                method: 'POST',
			                headers: headers,
			                body: body,
			                json: true
			            });
		            });
		        }
		        else if (event.type == 'message' && event.message.text == '一旦休憩します'){
		            var headers = {
		                'Content-Type': 'application/json',
		                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
		            }
		            var url = 'https://api.line.me/v2/bot/message/reply';
	            	loop3: for(var i=0; i<objectLen; i++){
	            		if (object.logData[i].userID == thisUserID){
	            			if(object.logData[i].lastCommand[0]=="end"){
					            var body2 = {
					                replyToken: event.replyToken,
					                messages: [{
					                    type: 'text',
					                    text: 'まだ勉強が開始されていません。\n先に「勉強開始」を押してください。'
					                }]
					            };
					            request({
					                url: url,
					                method: 'POST',
					                headers: headers,
					                body: body2,
					                json: true
					            });
					            continue loop3;
	            			} else if(object.logData[i].lastCommand[0]=="rest"){
					            var body2 = {
					                replyToken: event.replyToken,
					                messages: [{
					                    type: 'text',
					                    text: '既に「休憩開始」が押されている状態です。'
					                }]
					            };
					            request({
					                url: url,
					                method: 'POST',
					                headers: headers,
					                body: body2,
					                json: true
					            });
					            continue loop3;
	            			} else {
		            			object.logData[i].rest.push(nowTime);
		            			object.logData[i].lastCommand[0] = "rest";
	            			};
	            		};
	            	};
	            	var obj = JSON.stringify(object);
	            	var params = {Bucket: bucketName, Key: keyName, Body: obj};
	            	s3.putObject(params, function(err, data) {
					    if (err) { console.log(err, err.stack); };
				    });
		            var body = {
		                replyToken: event.replyToken,
		                messages: [{
		                    type: 'text',
		                    text: 'お疲れ様です。\nコーヒーでも飲まれますか？'
		                }]
		            }
		            request({
		                url: url,
		                method: 'POST',
		                headers: headers,
		                body: body,
		                json: true
		            });
		        }
		        else if (event.type == 'message' && event.message.text == '勉強を再開します'){
		            var headers = {
		                'Content-Type': 'application/json',
		                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
		            }
		            var url = 'https://api.line.me/v2/bot/message/reply';
	            	loop4: for(var i=0; i<objectLen; i++){
	            		if (object.logData[i].userID == thisUserID){
	            			if(object.logData[i].lastCommand[0]=="start" || object.logData[i].lastCommand[0]=="end"){
					            var body2 = {
					                replyToken: event.replyToken,
					                messages: [{
					                    type: 'text',
					                    text: 'そのボタンは「休憩開始」の後に押してください。'
					                }]
					            };
					            request({
					                url: url,
					                method: 'POST',
					                headers: headers,
					                body: body2,
					                json: true
					            });
					            continue loop4;
	            			} else if(object.logData[i].lastCommand[0]=="restart"){
					            var body2 = {
					                replyToken: event.replyToken,
					                messages: [{
					                    type: 'text',
					                    text: '連続で「勉強再開」を押さないでください！'
					                }]
					            };
					            request({
					                url: url,
					                method: 'POST',
					                headers: headers,
					                body: body2,
					                json: true
					            });
					            continue loop4;
	            			} else {
		            			object.logData[i].restart.push(nowTime);
		            			object.logData[i].lastCommand[0] = "restart";
	            			};
	            		};
		            	var obj = JSON.stringify(object);
		            	var params = {Bucket: bucketName, Key: keyName, Body: obj};
		            	s3.putObject(params, function(err, data) {
						    if (err) { console.log(err, err.stack); };
					    });
		            };
		            var body = {
		                replyToken: event.replyToken,
		                messages: [{
		                    type: 'text',
		                    text: 'そうですか。\nもう一息頑張りましょう！'
		                }]
		            };
		            request({
		                url: url,
		                method: 'POST',
		                headers: headers,
		                body: body,
		                json: true
		            });
		        }

		        if (event.type == 'message' && event.message.text){
		             // Mecabクラウドサービスでメッセージを解析
		            mecab.parse(event.message.text)
		            .then(
		                function(response){
		                      // 解析結果を出力
		                    console.log(response);
		                }
		            );
		        };
		    };
		};
	});
});


// TimestampをData型に変換する関数（タイムゾーン：東京に調整済み）
function ts2date(ts){
	var d = new Date(ts * 1000);
	var year  = d.getFullYear();
	var month = d.getMonth() + 1;
	var day  = d.getDate();
	var hour = ( d.getHours()   < 10 ) ? '0' + d.getHours()   : d.getHours();
	var min  = ( d.getMinutes() < 10 ) ? '0' + d.getMinutes() : d.getMinutes();
	var sec   = ( d.getSeconds() < 10 ) ? '0' + d.getSeconds() : d.getSeconds();
	if(hour=="00"){hour=0}else if(hour=="01"){hour=1}else if(hour=="02"){hour=2}else if(hour=="03"){hour=3}else if(hour=="04"){hour=4}else if(hour=="05"){hour=5}else if(hour=="06"){hour=6}else if(hour=="07"){hour=7}else if(hour=="08"){hour=8}else if(hour=="09"){hour=9};
	if(min=="00"){min=0}else if(min=="01"){min=1}else if(min=="02"){min=2}else if(min=="03"){min=3}else if(min=="04"){min=4}else if(min=="05"){min=5}else if(min=="06"){min=6}else if(min=="07"){min=7}else if(min=="08"){min=8}else if(min=="09"){min=9};
	if(sec=="00"){sec=0}else if(sec=="01"){sec=1}else if(sec=="02"){sec=2}else if(sec=="03"){sec=3}else if(sec=="04"){sec=4}else if(sec=="05"){sec=5}else if(sec=="06"){sec=6}else if(sec=="07"){sec=7}else if(sec=="08"){sec=8}else if(sec=="09"){sec=9};
	hour = hour + 9;
	if(hour >= 24){ hour = hour - 24 };
	var result = [hour, min, sec];
	return result;
};

// Data型の足し算関数
function dataSum(data1, data2){
	var hour = data1[0] + data2[0];
	var min = data1[1] + data2[1];
	var sec = data1[2] + data2[2];
	if(min>=60){ 
		hour = hour + 1;
		min = min - 60;
	};
	if(sec>=60){
		min = min + 1;
		sec = sec - 60;
	}
	var result = [hour, min, sec];
	return result;
}

// Data型の引き算関数
function dataDifference(data1, data2){
	var hour = data1[0] - data2[0];
	var min = data1[1] - data2[1];
	var sec = data1[2] - data2[2];
	if(hour<0){hour = (24 - data2[0]) + data1[0]};
	if(min<0){ 
		hour = hour - 1;
		min = min + 60;
	};
	if(sec<0){
		min = min - 1;
		sec = sec + 60;
	}
	var result = [hour, min, sec];
	return result;
}
