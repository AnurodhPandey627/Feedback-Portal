if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
const axios = require("axios");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
const express = require("express");
const app = express();
const { faker } = require("@faker-js/faker");
let port = 8080;
const mysql = require("mysql2/promise");
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const ExpressError = require("./utils/ExpressError");
const wrapAsync = require("./utils/wrapasync");
const { Ollama } = require("ollama");
const ollama = new Ollama();
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("express-flash");
const studentRegistrationSchema = require("./schema-validations/student-registration.js");
const teacherRegistrationSchema = require("./schema-validations/teacher-registration.js");
const teacherLoginSchema = require("./schema-validations/teacher-login.js");
const studentLoginSchema = require("./schema-validations/student-login.js");
const studentFeedbackSchema = require("./schema-validations/student-feedback.js");
const teacherFeedbackSchema = require("./schema-validations/teacher-feedback.js");
const studentQuestionnaireSchema = require("./schema-validations/student-questionnaire.js");

//Middlewares - require
const {
  isLoggedIn,
  saveRedirectUrl,
  isStudent,
  isTeacher,
  isCorrectStudent,
  isCorrectTeacher,
} = require("./middlewares.js");

//i18n
const { i18nMiddleware, supported } = require("./i18next.js");

const sessionSecret = process.env.sessionOptionsSecret;
const sessionOptions = {
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(cookieParser());
app.use(session(sessionOptions));
app.use(flash());
app.use((req, res, next) => {
  res.locals.successMsg = req.flash("success");
  res.locals.errorMsg = req.flash("error");
  next();
});

const path = require("path");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
//const { v4: uuidv4 } = require('uuid');
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
const otpRoutes = require("./routes/otp");
app.use(express.json());
app.use("/api/otp", otpRoutes); // /api/otp/request and /api/otp/verify routes for otp.js
const {
  mcqsToTranslationText,
  translationTextToMCQs,
  translateFunction,
} = require("./controllers/MCQController.js");

//i18n
app.use(i18nMiddleware);

//CONNECTION 1 : SCHOOL_SYSTEM DATABASE
const connection = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "school_system",
  password: "admin",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

//CONNECTION 2 : FACE_ATTENDANCE DATABASE
const connection2 = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "face_attendance_db",
  password: "admin",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

//-----NEW TEMPORARY ROUTE FOR FETCHING STUDENTS' ATTENDANCE------------
app.get("/fetch-attendance",async (req,res)=>{
  //fetching present students list from the db, temporarily
      let q2 = `SELECT DISTINCT student_roll_no FROM student_attendance_logs
                      WHERE DATE(recognized_at) = CURDATE()`;
      const [result2] = await connection2.query(q2);
      //console.log(result2); //result is an array
      const presents = new Set(result2.map((a) => a.student_roll_no));
      res.render("attendance.ejs",{presents});
});

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});

// route to change language
app.get("/set-lang", (req, res) => {
  const { lang, redirectTo } = req.query;
  const chosen = lang === "hi" ? "hi" : "en";

  // set cookie and (optionally) session for redundancy
  const cookieOptions = {
    maxAge: 30 * 24 * 3600 * 1000, // 30 days
    httpOnly: true, // safer: JS cannot read this cookie
    // secure: true, // enable in production with HTTPS
    sameSite: "lax",
    path: "/",
  };
  res.cookie("lang", chosen, cookieOptions);

  // optional: store preference in session too (useful if cookies disabled, or for server-side logic)
  if (req.session) req.session.lang = chosen;

  const dest = redirectTo || req.get("Referer") || "/";
  res.redirect(dest);
});

//Home Page
app.get("/", (req, res) => {
  res.render("homepage.ejs");
});

//NEW
app.get("/new", (req, res) => {
  res.render("get-started.ejs");
});

//STUDENT REGISRTATION SCHEMA VALIDATION
const validateStudentRegistrationSchema = (req, res, next) => {
  let { error } = studentRegistrationSchema.validate(req.body);
  if (error) {
    //console.log(error);
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//Student Registration Page
app.get("/newstudent", (req, res) => {
  res.render("student-registration.ejs");
});

// NEW STUDENT REGISTRATION
app.post("/newstudent", validateStudentRegistrationSchema, async (req, res) => {
  let {
    school,
    roll_no,
    class: sclass,
    sname,
    sphone_no,
    parent_phone_no,
    dob,
    aadhar_no,
    village,
    district,
    state,
    country,
  } = req.body;

  let q = `INSERT INTO student (
    school, roll_no, class, sname, sphone_no, parent_phone_no,
    dob, aadhar_no, village, district, state, country
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    school,
    roll_no,
    sclass,
    sname,
    sphone_no || null,
    parent_phone_no,
    dob,
    aadhar_no,
    village,
    district,
    state,
    country,
  ];

  try {
    const [result] = await connection.query(q, values);
    const newSID = result.insertId;
    req.flash("success", "New Student registered!");
    res.redirect(`/student/${newSID}`);
  } catch (error) {
    console.error("Unhandled Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      throw new ExpressError(
        400,
        "Student already exists, Aadhar Number must be unique",
      );
    } else {
      next(error);
    }
  }
});

//TEACHER REGISRTATION SCHEMA VALIDATION
const validateTeacherRegistrationSchema = (req, res, next) => {
  let { error } = teacherRegistrationSchema.validate(req.body);
  if (error) {
    //console.log(error);
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//TEACHER'S REGISTRATION PAGE
app.get("/newteacher", (req, res) => {
  res.render("teacher-registration.ejs");
});

//NEW TEACHER REGISTRATION
app.post("/newteacher", validateTeacherRegistrationSchema, async (req, res) => {
  const {
    school,
    tname,
    tphone,
    aadhar_no,
    highest_qualifications,
    village,
    state,
    district,
    country,
  } = req.body;

  const sql = `
    INSERT INTO teacher 
    (school, tname, tphone, aadhar_no, highest_qualifications, village, state, district, country)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await connection.query(sql, [
      school,
      tname,
      tphone,
      aadhar_no,
      highest_qualifications,
      village,
      state,
      district,
      country,
    ]);

    const newTID = result.insertId;
    req.flash("success", "New Teacher registered!");
    res.render(`/teacher/${newTID}`);
  } catch (error) {
    console.error("Unhandled Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      next(
        new ExpressError(
          400,
          "Student already exists, Aadhar Number must be unique",
        ),
      );
    } else {
      next(error);
    }
  }
});

//TEACHER LOGIN SCHEMA VALIDATION
const validateTeacherLoginSchema = (req, res, next) => {
  let { error } = teacherLoginSchema.validate(req.body);
  if (error) {
    //console.log(error);
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//TEACHER LOGIN
app.get("/oldteacher", (req, res) => {
  res.render("teacher-login.ejs");
});

//TEACHER LOGIN POST ROUTE
app.post(
  "/oldteacher",
  saveRedirectUrl,
  validateTeacherLoginSchema,
  async (req, res) => {
    const { aadhar_no, tphone } = req.body;

    const query = `
    SELECT * FROM teacher 
    WHERE aadhar_no = ? AND tphone = ?
  `;

    try {
      const [results] = await connection.query(query, [aadhar_no, tphone]);
      //console.log(results);
      if (results.length === 1) {
        // Successful login
        const teacher = results[0];
        req.session.user = {
          id: teacher.TID,
          role: "teacher",
        };
        req.flash("success", "Login Successfull!");
        let redirectUrl = res.locals.redirectUrl || `/teacher/${teacher.TID}`;
        //console.log("rediectUrl: "+redirectUrl);
        return res.redirect(redirectUrl);
      } else {
        // Login failed
        req.flash("error", "Invalid Login Credentials");
        res.redirect("/oldteacher");
      }
    } catch (error) {
      console.log("Login Error: " + error);
      next(error);
    }
  },
);

//STUDENT LOGIN SCHEMA VALIDATION
const validateStudentLoginSchema = (req, res, next) => {
  let { error } = studentLoginSchema.validate(req.body);
  if (error) {
    //console.log(error);
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//Student Login
app.get("/oldstudent", (req, res) => {
  res.render("student-login.ejs");
});

//Post Student Login
app.post(
  "/oldstudent",
  saveRedirectUrl,
  validateStudentLoginSchema,
  async (req, res) => {
    const { school, class: sclass, roll_no } = req.body;

    // Basic validation
    if (!school || !sclass || !roll_no) {
      return res
        .status(400)
        .json({ error: "School, Class and roll number are required." });
    }

    console.log(school);
    console.log(sclass);
    console.log(roll_no);
    const query =
      "SELECT * FROM student WHERE school = ? AND class = ? AND roll_no = ?";

    try {
      const [results] = await connection.query(query, [
        school,
        sclass,
        roll_no,
      ]);
      console.log("results:" + results);
      if (results.length === 1) {
        // Successful login
        const student = results[0];
        req.flash("success", "Login Successfull!");
        req.session.user = {
          id: student.SID,
          role: "student",
        };
        let redirectUrl = res.locals.redirectUrl || `/student/${student.SID}`;
        //console.log("rediectUrl");
        return res.json({
          student: student,
          redirectUrl: redirectUrl,
        });
      } else {
        return res.status(401).json({ error: "Invalid Login credentials!" });
      }
    } catch (error) {
      console.log("Student Login Error:" + error);
      return res.status(500).json({ error: "Server error, please try later" });
      //next(error);
    }
  },
);

//STUDENT SCHEDULE PAGE
app.get("/schedule", isLoggedIn, isStudent, isCorrectStudent, (req, res) => {
  let StudentId = req.query.SID;
  res.render("schedule.ejs", { StudentId });
});

//STUDENT FEEDBACK SCHEMA VALIDATION
const validateStudentFeedbackSchema = (req, res, next) => {
  let { error } = studentFeedbackSchema.validate(req.body);
  if (error) {
    //console.log(error);
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//STUDENT FEEDBACK PAGE
app.get(
  "/student/feedback",
  isLoggedIn,
  isStudent,
  isCorrectStudent,
  async (req, res) => {
    let studentId = req.query.SID;
    let subjectId = req.query.SUBID;
    let subname = req.query.SUBNAME;
    let DAY = req.query.DAY;
    let P_NO = req.query.P_NO;

    const q1 = `SELECT TID
              FROM allocation
              WHERE SUBID = ?
  `;

    try {
      const [result] = await connection.query(q1, [subjectId]);
      //console.log(result);//result is an array of objects
      const TID = result[0].TID;
      //console.log(TID);
    } catch (err1) {
      console.log(err1);
      next(err1);
    }

    const q2 = `SELECT ft.topic
      FROM feedback_topics ft
      JOIN teacher_feedback tf ON tf.TFID = ft.TFID
      WHERE YEARWEEK(tf.created_on, 1) = YEARWEEK(CURDATE(), 1)
            AND tf.DAY = ? 
            AND tf.P_NO = ? 
    `;

    try {
      const [result2] = await connection.query(q2, [DAY, P_NO]);
      //console.log(result2);//result2 is an array of objects
      const topics = result2.map((row) => row.topic);
      //console.log(topics);
      res.render("feedback-by-student.ejs", {
        studentId,
        subjectId,
        subname,
        topics,
      });
    } catch (err2) {
      console.log(err2);
      next(err2);
    }
  },
);

//STUDENT FEEDBACK STORAGE TO DB
app.post(
  "/student/feedback",
  isLoggedIn,
  isStudent,
  isCorrectStudent,
  validateStudentFeedbackSchema,
  async (req, res, next) => {
    const {
      SID,
      SUBID,
      class_start_time,
      class_end_time,
      topics, // Expecting an array
      understanding,
      interaction,
      practical_example,
      prev_hw,
      curr_hw,
      additional_feedback,
    } = req.body;

    const feedbackValuesInsertion = [
      SID,
      SUBID,
      class_start_time,
      class_end_time,
      understanding,
      interaction,
      practical_example,
      prev_hw,
      curr_hw,
      additional_feedback,
    ];
    const feedbackValuesUpdation = [
      class_start_time,
      class_end_time,
      understanding,
      interaction,
      practical_example,
      prev_hw,
      curr_hw,
      additional_feedback,
    ];

    const checkQuery = `
    SELECT SFID FROM student_feedback 
    WHERE SID = ? AND SUBID = ? AND YEARWEEK(DATE, 1) = YEARWEEK(CURDATE(), 1)
  `;

    try {
      const [results] = await connection.query(checkQuery, [SID, SUBID]);

      if (results.length > 0) {
        // UPDATE CASE
        const SFID = results[0].SFID;

        const updateQuery = `
            UPDATE student_feedback
            SET DATE = CURDATE(), class_start_time = ?, class_end_time = ?, created_at = CURRENT_TIMESTAMP, understanding = ?, interaction = ?, practical_example = ?, prev_hw = ?, curr_hw = ?, additional_feedback = ?
            WHERE SID = ? AND SUBID = ? AND YEARWEEK(DATE, 1) = YEARWEEK(CURDATE(), 1)
          `;

        try {
          await connection.query(updateQuery, [
            ...feedbackValuesUpdation,
            SID,
            SUBID,
          ]);

          // Remove old topics
          const deleteQuery = `DELETE FROM student_feedback_topics WHERE SFID = ?`;
          try {
            await connection.query(deleteQuery, [SFID]);

            //Insert New Topics

            const getTFIDQuery = `
                  SELECT TFID, topic, TOPICID FROM feedback_topics 
                  WHERE topic IN (?) 
                  AND TFID IN (SELECT TFID FROM teacher_feedback WHERE SUBID = ?)
                `;

            try {
              const [topicRows] = await connection.query(getTFIDQuery, [
                topics,
                SUBID,
              ]);
              const topicsValues = topicRows.map((row) => [
                SFID,
                row.TOPICID,
                row.topic,
              ]);

              try {
                const insertTopicsQuery = `INSERT INTO student_feedback_topics (SFID, TOPICID, topic) VALUES ?`;
                await connection.query(insertTopicsQuery, [topicsValues]);

                console.log("Feedback and topic links inserted");
                res.redirect(`/student/questionnaire?SFID=${SFID}`);
              } catch (err5) {
                console.log(
                  "Error inserting new topics into student_feedback_topics: " +
                    err5,
                );
                next(err5);
              }
            } catch (err4) {
              console.log(
                "Error fetching topic details from feedback-topics: " + err4,
              );
              next(err4);
            }
          } catch (err3) {
            console.log(
              "Error deleting existing topics from student feedback: " + err3,
            );
            next(err3);
          }
        } catch (err2) {
          console.log("Error updating feedback: " + err2);
          next(err2);
        }
      } else {
        // INSERT CASE
        const insertQuery = `
      INSERT INTO student_feedback (SID, SUBID, class_start_time, class_end_time, understanding, interaction, practical_example, prev_hw, curr_hw, additional_feedback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

        try {
          const [result5] = await connection.query(
            insertQuery,
            feedbackValuesInsertion,
          );

          const SFID = result5.insertId;

          //Get TFID (from teacher_feedback for the current week)
          const getTFIDQuery = `
          SELECT TFID FROM teacher_feedback 
          WHERE SUBID = ? AND YEARWEEK(created_on, 1) = YEARWEEK(CURDATE(), 1)
        `;

          try {
            const [results6] = await connection.query(getTFIDQuery, [SUBID]);

            const TFID = results6[0].TFID;

            //Get matching TOPICIDs from feedback_topics
            const getTopicIDsQuery = `
              SELECT TOPICID, topic FROM feedback_topics 
              WHERE TFID = ? AND topic IN (?)
            `;

            try {
              const [results7] = await connection.query(getTopicIDsQuery, [
                TFID,
                topics,
              ]);

              //Prepare insertion values
              const topicInsertValues = results7.map((row) => [
                SFID,
                row.TOPICID,
                row.topic,
              ]);

              const insertTopicsQuery = `INSERT INTO student_feedback_topics (SFID, TOPICID, topic) VALUES ?`;

              try {
                await connection.query(insertTopicsQuery, [topicInsertValues]);
                console.log("Feedback and topics inserted");
                res.redirect(`/student/questionnaire?SFID=${SFID}`);
              } catch (err9) {
                console.log(
                  "error inserting topics in student_feedback_toics: " + err9,
                );
                next(err9);
              }
            } catch (err8) {
              console.log("Error fetching Topic IDs :" + err8);
              next(err8);
            }
          } catch (err7) {
            console.log("Error fetching TFIDs: " + err7);
            next(err7);
          }
        } catch (err6) {
          console.log("Error inserting feedback in student_feedback: " + err6);
          next(err6);
        }
      }
    } catch (err) {
      console.log("Error Checking existing feedback: " + err);
      next(err);
    }
  },
);

//STUDENT QUESTIONNAIRE SCHEMA VALIDATION
const validateStudentQuestionnaireSchema = (req, res, next) => {
  let { error } = studentQuestionnaireSchema.validate(req.body);
  if (error) {
    //console.log(error);
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// STUDENT QUESTIONNAIRE
app.get(
  "/student/questionnaire",
  isLoggedIn,
  isStudent,
  isCorrectStudent,
  wrapAsync(async (req, res, next) => {
    const SFID = req.query.SFID;

    const q = `SELECT topic FROM student_feedback_topics WHERE SFID = ?`;

    const [result] = await connection.query(q, [SFID]);

    const topics = result.map((row) => row.topic);

    // Generate prompt for Ollama
    const prompt =
      `Generate 1 simple MCQ for each of the following topics:\n${topics.join(", ")}.\n` +
      "Your response must strictly follow this format without any explanations:\n" +
      "Q: <question>\n" +
      "A) <option1>\n" +
      "B) <option2>\n" +
      "C) <option3>\n" +
      "D) <option4>\n" +
      "Answer: <A/B/C/D>";

    const response = await ollama.generate({
      model: "mistral",
      prompt,
    });

    const raw = response.response;
    console.log("RAW MISTRAL OUTPUT:\n", raw);

    const cleanText = cleanOllamaResponse(raw);
    console.log("CLEANED TEXT:\n", cleanText);

    let questions = parseMCQs(cleanText);
    console.log("PARSED MCQs:\n", questions);

    //check language
    const lang = res.locals.lang;
    console.log("lang: " + lang);

    if (lang === "hi") {
      //translation from english to hindi
      const englishText = mcqsToTranslationText(questions);
      console.log(englishText);
      //This is the format of the english text after transformation
      //   const englishText = `Which of the following is a primary source of energy for our bodies?
      // Carbon dioxide, Oxygen, Glucose, Water

      // During cellular respiration, what do glucose molecules ultimately convert to produce ATP and water?
      // Carbon dioxide, Oxygen, Hydrogen, Nitrogen
      // `

      const hindiText = await translateFunction(englishText);
      console.log("HINDI TEXT:\n", hindiText);

      const hindiMCQs = translationTextToMCQs(hindiText, questions);
      console.log("HINDI MCQs:\n", hindiMCQs);

      questions = hindiMCQs;
    }

    res.render("questions.ejs", { questions, SFID });
  }),
);

// ——————————————————————————————
// Clean Ollama Response
function cleanOllamaResponse(text) {
  return text
    .replace(/\r/g, "") // kill carriage returns
    .replace(/^\s+/gm, "") // trim leading spaces on each line
    .replace(/Topic:.*?\n/gi, "") // drop any “Topic:” lines
    .replace(/\n{2,}/g, "\n") // collapse multiple blank lines
    .trim();
}

// ——————————————————————————————
// Robust MCQ Parser
function parseMCQs(text) {
  const regex =
    /Q:\s*(.+?)\s*\n\s*A\)\s*(.+?)\s*\n\s*B\)\s*(.+?)\s*\n\s*C\)\s*(.+?)\s*\n\s*D\)\s*(.+?)\s*\n\s*Answer:\s*([A-D])/gi;

  const matches = [...text.matchAll(regex)];

  return matches.map((match) => ({
    question: match[1].trim(),
    options: [
      match[2].trim(),
      match[3].trim(),
      match[4].trim(),
      match[5].trim(),
    ],
    answer: match[6].trim().toUpperCase(),
  }));
}

//QUESTIONS AND ANSWERS INSERTION IN DB
app.post(
  "/student/questionnaire",
  isLoggedIn,
  isStudent,
  isCorrectStudent,
  validateStudentQuestionnaireSchema,
  wrapAsync(async (req, res) => {
    const SFID = req.query.SFID;
    const { answers, q_texts, correct_answers } = req.body;

    // Convert to array if they aren't already (in case there's only one question)
    const answerArray = Array.isArray(answers) ? answers : [answers];
    const questionArray = Array.isArray(q_texts) ? q_texts : [q_texts];
    const correctAnswerArray = Array.isArray(correct_answers)
      ? correct_answers
      : [correct_answers];

    // Prepare question values for bulk insert
    const questionValues = questionArray.map((q, i) => [
      q,
      correctAnswerArray[i],
    ]);

    const insertQuestionsQuery = `INSERT INTO question (question_text, correct_answer) VALUES ?`;

    const [result1] = await connection.query(insertQuestionsQuery, [
      questionValues,
    ]);

    const insertedIds = Array.from(
      { length: result1.affectedRows },
      (_, i) => result1.insertId + i,
    );

    const studentAnswerValues = insertedIds.map((qid, i) => [
      SFID,
      qid,
      answerArray[i],
    ]);

    const insertAnswersQuery = `INSERT INTO student_answers (SFID, QID, student_answer) VALUES ?`;

    await connection.query(insertAnswersQuery, [studentAnswerValues]);

    console.log("Questions and answers inserted successfully");
    const getSIDquery = `SELECT SID FROM student_feedback WHERE SFID = ?`;
    const [result3] = await connection.query(getSIDquery, [SFID]);
    const SID = result3[0].SID;
    req.flash("success", "Feedback submitted successfully!");
    res.redirect(`/student/${SID}`);
  }),
);

//Student Dashboard
app.get(
  "/student/:id",
  isLoggedIn,
  isStudent,
  isCorrectStudent,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    //console.log(`${id}`);
    let q = `SELECT * FROM student WHERE SID = ?`;

    const [result] = await connection.query(q, [id]);

    //console.log(result);//result is an array

    if (result.length === 0) {
      next(new ExpressError(404, "Student Not Found"));
    } else {
      const student = result[0];
      res.render("student-dashboard.ejs", { student });
    }
  }),
);

//TEACHER SCHEDULE PAGE
app.get(
  "/teacher-schedule",
  isLoggedIn,
  isTeacher,
  isCorrectTeacher,
  wrapAsync(async (req, res) => {
    let TID = req.query.TID;
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const currentDay = days[new Date().getDay()];
    const todayDate = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const scheduleQuery = `
    SELECT 
        s.day, 
        p.P_NO, 
        sub.subname, 
        p.start_time, 
        p.end_time,
        sub.SUBID
    FROM 
        schedule s
    JOIN 
        period p ON s.P_NO = p.P_NO
    JOIN 
        subject sub ON s.SUBID = sub.SUBID
    WHERE 
        s.TID = ? AND s.day = ?
    ORDER BY 
        p.P_NO;
  `;

    const [scheduleResults] = await connection.query(scheduleQuery, [
      TID,
      currentDay,
    ]);

    const subids = scheduleResults.map((row) => row.SUBID);

    if (subids.length === 0) {
      return res.render("teacher-schedule.ejs", { schedule: [], TID });
    }

    // Now check which subjects already have feedback for today
    const feedbackQuery = `
      SELECT SUBID FROM teacher_feedback 
      WHERE TID = ? AND CREATED_ON = ?
    `;

    const [feedbackResults] = await connection.query(feedbackQuery, [
      TID,
      todayDate,
    ]);

    const submittedSubids = feedbackResults.map((row) => row.SUBID);

    // Add feedbackSubmitted flag to each schedule item
    const finalSchedule = scheduleResults.map((item) => ({
      ...item,
      feedbackSubmitted: submittedSubids.includes(item.SUBID),
    }));

    res.render("teacher-schedule.ejs", { schedule: finalSchedule, TID });
  }),
);

//TEACHER FEEDBACK SCHEMA VALIDATION
const validateTeacherFeedbackSchema = (req, res, next) => {
  let { error } = teacherFeedbackSchema.validate(req.body);
  if (error) {
    //console.log(error);
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//TEACHER FEEDBACK PAGE
app.get(
  "/teacher/feedback",
  isLoggedIn,
  isTeacher,
  isCorrectTeacher,
  (req, res) => {
    let TID = req.query.TID;
    let SUBID = req.query.SUBID;
    let DAY = req.query.DAY;
    let P_NO = req.query.PERIOD;

    res.render("feedback-by-teacher.ejs", { TID, SUBID, DAY, P_NO });
  },
);

//TEACHER'S DASHBOARD
app.get(
  "/teacher/:id",
  isLoggedIn,
  isTeacher,
  isCorrectTeacher,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).send({ message: "Invalid Teacher ID" });
    }
    //console.log(`${id}`);
    let q = `SELECT * FROM teacher WHERE TID = ?`;

    const [result] = await connection.query(q, [id]);
    //console.log(result);//result is an array
    let teacher = result[0];
    if (result.length === 0) {
      next(new ExpressError(404, "Teacher Not Found"));
    } else {
      //successfull login
      req.flash("successs", "Login Successfull!");
      res.render("teacher-dashboard.ejs", { teacher});
    }
  }),
);

// TEACHER FEEDBACK STORAGE TO DATABASE
app.post(
  "/teacher/feedback",
  isLoggedIn,
  isTeacher,
  isCorrectTeacher,
  validateTeacherFeedbackSchema,
  async (req, res, next) => {
    try {
      const {
        TID,
        SUBID,
        DAY,
        P_NO,
        class_start_time,
        class_end_time,
        present_students,
        topics, // expecting an array of topics
        additional_feedback,
        rating,
      } = req.body;

      const q1 = `INSERT INTO teacher_feedback (TID, SUBID, DAY, P_NO, class_start_time, class_end_time, present_students, additional_feedback, rating) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const feedbackValues = [
        TID,
        SUBID,
        DAY,
        P_NO,
        class_start_time,
        class_end_time,
        present_students,
        additional_feedback,
        rating,
      ];

      const [result] = await connection.query(q1, feedbackValues);

      const TFID = result.insertId;

      const currentDate = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format

      const q2 = `
      INSERT INTO feedback_submission_status (TID, SUBID, last_feedback_date) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE last_feedback_date = ?;
    `;

      await connection.query(q2, [TID, SUBID, currentDate, currentDate]);
      console.log("Feedback submission status updated");

      const q3 = `INSERT INTO feedback_topics (TFID, topic) VALUES ?`;

      const topicsValues = topics.map((topic) => [TFID, topic]);

      await connection.query(q3, [topicsValues]);

      req.flash("success", "Feedback Submitted Successfully!");
      res.redirect(`/teacher/${TID}`);
    } catch (err) {
      console.error("Error in /teacher/feedback:", err);
      next(err);
    }
  },
);

//Logout
app.get("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

//Page Not Found
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

//Custom Error handling Middleware
app.use((err, req, res, next) => {
  console.log(err);
  const { status = 500, message = "Some Error Occured" } = err;
  res.status(status).render("error.ejs", { message });
});
