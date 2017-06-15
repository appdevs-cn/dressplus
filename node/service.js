/**
 * Created by qu on 2016/8/23.
 */

var config = require('../upload.config.js');
var qiniu = require('qiniu');
var moment = require("moment");
var uptoken = new qiniu.rs.PutPolicy(config.Bucket_Name);
//登陆
exports.login = function(params,session){
   return {
       url:"/user/login",
       type:"post",
       data:{
           user_name:params.account,
           password:params.password
       }

   }
};
//获取验证码
exports.getVerify = function(params,session){
   return {
       url:"/verify/code",
       type:"post",
       data:{}
   }
};
//校验验证码
exports.verifyCheck = function(params,session){
   return {
       url:"/verify/check",
       type:"post",
       data:{
            code:params.code,
            ckey:params.ckey
       }

   }
};
//校验验证码
exports.resetpassword = function(params,session){
    var data = {
        userName:params.userName
    }
    if(params.step == 100){
        data.step = 100;
    } else {
        data.password = params.password;
        data.step = 200;
        data.userId=params.user_id;
    }
    return {
       url:"/user/resetPass",
       type:"post",
       data:data
   }
};
//注册
exports.register = function(params,session){
   return {
       url:"/user/register",
       type:"post",
       data:{
            password:params.password,
            email:params.email,
            tel:Number(params.tel),
            companyName:params.companyName,
            registerFrom:params.registerFrom
            // registerTime:moment().format("YYYY-MM-DD HH:mm:ss"),
            // registerIp:session.ip
       }

   }
};
//邮箱激活
exports.activation = function(params,session){
   return {
       url:"/user/activation",
       type:"post",
       data:{
            code:params.code,
            userId:params.userId,
            registerFrom:params.registerFrom,
            type:params.type
       }

   }
};
//重新激活
exports.reSend = function(params,session){
   return {
       url:"/user/reSend",
       type:"post",
       data:{
            userId:params.userId,
            email:params.email
       }

   }
};

exports.deleteVideo = function (params,session) {
    return{
        url:"/video/delete",
        type:"post",
        data:{
            videoIds:params.videoIds
        }
    }
}

exports.getVideoList = function (params,session) {
    return{
        url:"/video/list",
        type:"post",
        data:{
            userId:params.userId,
            page:params.cursor,
            size:params.step
        }
    }
}

exports.searchByName = function (params,session) {
    return{
        url:"/video/searchByName",
        type:"post",
        data:{
            userId:params.userId,
            videoName:params.serachString,
            page:params.page,
            size:params.size
        }
    }
}

exports.uploadVideo = function (params,seesion) {
    return{
        url:"/video/upload",
        type:"post",
        data:{
            userId:params.userId,
            videoUrl:params.url,
            videoName:params.name,
            videoSize:params.size,
            qnVideoId:params.qnVideoId
        }
    }
}

exports.searchByTag = function (params) {
    return{
        url:"/video/searchTag",
        type:"post",
        data:{
            videoId:params.videoId,
            tagName:params.serachString,
            duration:params.rangeVal
        }
    }
}

exports.getVideoDetail = function (params) {
    return{
        url:"/video/info",
        type:"post",
        data:{
            videoId:params.videoId
        }
    }
}


exports.getUserInfo = function (params) {
    return{
        url:"/user/info",
        type:"post",
        data:{
            userId:params.userId
        }
    }
}

exports.getToken = function (params) {
    return{
        url:"/video/qnUploadToken",
        type:"post",
        data:{}
    }
}




