define(function(req,exp,mod){
	"use strict";
	var emit = req("utils.emit");

    var service = function(uri){
        return emit(uri, "service");
    };

    mod.exports = {
        login: service("login"),                   /*登陆*/
        register: service("register"),             /*注册短信验证码等*/
        getVerify: service("getVerify"),           /*验证码*/
        verifyCheck: service("verifyCheck"),       /*校验验证码*/
        activation: service("activation"),         /*邮箱激活*/
        reSend: service("reSend"),                 /*重新激活*/
        resetpassword: service("resetpassword"),   /*重置密码*/
        getVideoList:service("getVideoList"),      //获取视频列表
        uploadVideo: service("uploadVideo"),       //上传视频列表
        searchByName:service("searchByName"),       //搜索视频通过姓名（列表页）
        getVideoDetail:service("getVideoDetail"),   //获取视频详情页
        searchByTag:service("searchByTag"),         //搜索视频通过标签名（详情页）
        deleteVideo:service("deleteVideo"),         //删除视频
        getUserInfo:service("getUserInfo"),         //获得用户信息
        getToken:service("getToken"),
        _end_: 0
	};

});
