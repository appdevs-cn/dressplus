/**
 * Created by huyuqiong on 2016/12/16.
 */
define(function(req,exp){
    "use strict";

    var service = req("utils.ajax");
    exp.getVerifyCode="";
    exp.args = {
        password:"",
        account:""
    }
    exp.onInit = function (done) {  

        // 获取验证码
        exp.changecode();
        if(sessionStorage.userId){
            exp.go("list");
        }else {
            done();
        }       
    }

    var lock=true;
    exp.login = function () {
        if (!validate()) {
            $(".ui-error-con").show();
            return false;
        };
        if (lock) {
            lock=false;
            service.verifyCheck({
                code:exp.getVerifyCode,
                ckey:$(".getVerify").attr("ckey")
            },function(rs){
                if (rs.status=="SUCCESS") {
                    service.login(exp.args,function (resdata) {
                        lock=true;
                        if(resdata.status == "SUCCESS"){
                            sessionStorage.userId =localStorage.userId= resdata.data.userId;
                            sessionStorage.name = resdata.data.name;
                            exp.go("list");
                        }else{
                            exp.changecode();
                            $(".ui-error-con").show().html(resdata.msg);
                        }
                    });
                }else{
                    lock=true;
                    $(".ui-error-con").show().html(rs.msg);
                }
            })
        };
    }

    exp.register = function(){
        exp.go("register");
    }

    exp.resetpassword=function(){
        exp.go("resetPassword");
    }

    exp.hideError = function () {
        $(".ui-error-con").hide();
    }

    exp.changecode=function(){
        //获取验证码
        service.getVerify(function(data){
            $(".getVerify").attr("src",'data:image/png;base64,' + data.data.code);
            $(".getVerify").attr("ckey",data.data.ckey);
        })
    }

    const EMAIL=/^[\w\-]+@([\w\-]+\.)+(com|net|cn|com\.cn|cc|info|me|org)$/;
    const PASSWORD=/^[A-Za-z0-9_]{6,20}$/;
    // 验证是否合法字符
    function validate(){
        if (!EMAIL.test(exp.args.account)) {
            return false;
        };
        if (!PASSWORD.test(exp.args.password)) {
            return false;
        };
        if (exp.getVerifyCode=="") {
           return false;
        };
        return true;
    }
});