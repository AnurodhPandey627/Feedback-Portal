const wrapAsync = require("./utils/wrapasync");

module.exports.isLoggedIn = (req,res,next)=>{
    if(req.session && req.session.user){
        //console.log(req.session);
        //console.log("User: "+ req.session.user.role);
        return next();
    }
    req.flash("error","You must be logged in");
    //save redirectUrl
    //console.log("OriginalUrl: "+ req.originalUrl);
    req.session.redirectUrl = req.originalUrl;
    res.redirect("/");
}

//for automatic redirect after login
module.exports.saveRedirectUrl = (req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}

module.exports.isStudent = (req,res,next)=>{
    if(req.session.user && req.session.user.role==="student"){
        return next();
    }
    req.flash("error","You are not a student!");
    res.redirect("/");
}

module.exports.isTeacher = (req,res,next)=>{
    if(req.session.user && req.session.user.role==="teacher"){
        return next();
    }
    req.flash("error","You are not a teacher!");
    res.redirect("/");
}

module.exports.isCorrectStudent = wrapAsync(async (req,res,next)=>{
    let SID = req.params.id || req.query.SID || req.body.SID;
    if(!SID){
        const SFID = req.query.SFID;
        let q = `SELECT SID from student_feedback WHERE SFID = ?`;
        const [result] = await connection.query(q,[SFID]);
        if(result.length===0){
            req.flash("error","Can not find feedback");
            return res.redirect("/");
        }
        SID = result[0].SID;
    }
    if(req.session.user && req.session.user.role==='student' && req.session.user.id == SID){
        return next();
    }
    req.flash("error","You can not access other student's data");
    res.redirect("/");
});

module.exports.isCorrectTeacher = (req,res,next)=>{
    const TID = req.params.id || req.query.TID || req.body.TID;
    if(req.session.user && req.session.user.role==='teacher' && req.session.user.id == TID){
        return next();
    }
    req.flash("error","You can not access other teacher's data");
    res.redirect("/");
}