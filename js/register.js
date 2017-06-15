/**
 * Created by huyuqiong on 2016/12/16.
 */
define(function(req,exp){
    "use strict";

    var service = req("utils.ajax");

    exp.registerResult=false;
    exp.registerSuccess=false;
    exp.registerVerifyCode="";
    exp.args = {
        password:"",
        email:"",
        tel:"",
        companyName:"",
        registerFrom:"100",
    }
    exp.onInit = function (done) {
        exp.changecode();

        //如果邮箱激活进来
        //url="www.test.com/#register/activation/code/user_id/fasdfad"
        var dress=window.location.href;
        if (dress.indexOf("activation/")>0) {
            exp.registerSuccess=true;
            var start=dress.indexOf("activation/")+11;
            var code=dress.substring(start,dress.indexOf("/user_id"));
            var data={};
            data.code=code;
            data.userId=dress.substring(dress.lastIndexOf("/")+1);
            data.registerFrom="100",
            data.type="100";
            service.activation(data,function (rs) {
                if(rs.status == "SUCCESS"){
                    $(".registerSuccess .action").html("注册成功");
                    $(".registerSuccess .content").show();
                    $("#activationsuccess").addClass("success_icon");
                    var time=setInterval(function(){
                        var value=parseInt($("#endtime").text());
                        if (value==0) {
                            clearInterval(time);
                            exp.login();
                        }else{
                            value--;
                           $("#endtime").html(value) 
                        }
                    },1000);
                }else{
                    $(".registerSuccess .action").html("激活失败").show();
                }
            });
        }else{
           exp.registerSuccess=false; 
        }
        done();
    }
    var lock=true;
    exp.register = function () {
        if (!validate()) {
            return false;
        };
        if (lock) {
            lock=false;
            service.verifyCheck({
                code:exp.registerVerifyCode,
                ckey:$(".registerVerify").attr("ckey")
            },function(rs){
                if (rs.status=="SUCCESS") {
                    registersend();
                }else{
                    lock=true;
                    $(".ui-error-text").html("验证码错误").show();
                }
            })
        };
    }

    exp.login=function(){
        exp.go("login");
    }

    exp.rewrite=function(){
        $(".ui-registerResult-con").hide();
        $(".ui-default-con").show();
    }
    // 重新激活
    exp.resend=function(){
        var senddata={};
        senddata.userId=localStorage.userId;
        senddata.email=exp.args.email;
        service.reSend(senddata,function (rs) {
            if(rs.status == "SUCCESS"){
                localStorage.userId = rs.data.userId;
            }
        });
    }

    exp.hideError = function () {
        $(".ui-error-text").hide();
    }

    exp.changecode=function(){
        //获取验证码
        service.getVerify(function(data){
            $(".registerVerify").attr("src",'data:image/png;base64,' + data.data.code);
            $(".registerVerify").attr("ckey",data.data.ckey);
        })
    }

    // 发送注册请求
    function registersend(){
        service.register(exp.args,function (rs) {
            lock=true;
            if(rs.status == "SUCCESS"){
                localStorage.userId = rs.data.userId;
                $(".ui-registerResult-con").show();
                $(".ui-default-con").hide();
                $(".ui-registerResult-con .email").html(exp.args.email);
            }else{
                exp.changecode();
                var msg=rs.msg|| "注册失败请重新注册";
                $(".ui-error-text").html(msg).show();
                $(".ui-error-text").html(rs.msg).show();
            }
        });
    }
    const EMAIL=/^[\w\-]+@([\w\-]+\.)+(com|net|cn|com\.cn|cc|info|me|org)$/;
    const TEL=/^1[3|4|5|8][0-9]\d{4,8}$/;
    const COMPANYY=/^[A-Za-z0-9]{3,20}$/;
    const PASSWORD=/^[A-Za-z0-9_]{6,20}$/;
    // 验证是否合法字符
    function validate(){
        var errormessage="";
        if (!EMAIL.test(exp.args.email)) {
            errormessage+=" 邮箱";
        };
        if (!TEL.test(exp.args.tel)) {
            errormessage+=" 电话号码";
        };
        if (exp.args.companyName.length>20 || exp.args.companyName.length<3) {
            errormessage+=" 公司名称";
        };
        if (!PASSWORD.test(exp.args.password)) {
            errormessage+=" 密码";
        };
        if (exp.registerVerifyCode=="") {
            errormessage+=" 验证码";
        };
        if (errormessage=="") {
            return true;
        }else{
            errormessage+="格式不合法"
            $(".ui-error-text").html(errormessage).show();
            return false;
        }
    }
});