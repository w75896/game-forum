const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

// 使用 EJS 當模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'html'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const multer = require('multer');
const upload = multer();
// 解析 POST 表單資料
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('html'));  // 這樣 /public/css/forum.css 就能用 /css/forum.css 載入

// 設定 Session
app.use(session({
  secret: '遊戲論壇秘密鑰匙',
  resave: false,
  saveUninitialized: true,
  rolling: true,
  cookie: { maxAge: 600000 } // 10分鐘
}));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'rrtt',
  password: '0000',
  database: 'game',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});



// 首頁導向登入頁
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 顯示登入頁
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// 處理登入請求
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  pool.query('SELECT * FROM users WHERE Username = ?', [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.redirect('/login?error=' + encodeURIComponent('資料庫錯誤'));
    }

    if (results.length === 0 || results[0].Password !== password) {
      return res.redirect('/login?error=' + encodeURIComponent('帳號或密碼錯誤'));
    }

    // 登入成功
    req.session.username = username;

    pool.query(
      'UPDATE users SET LastLoginDate = NOW() WHERE Username = ?',
      [username],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.redirect('/login?error=' + encodeURIComponent('登入時更新時間失敗'));
        }
        res.redirect('/forum');
      }
    );

  });
});
// 註冊頁面
app.get('/register', (req, res) => {
  res.render('register');
});

// 註冊頁面
app.get('/personalfile', (req, res) => {
  const username = req.session.username;

  res.render('personalfile', { username });
});
// 註冊處理
app.post('/register', (req, res) => {
  const { username, password, password2, email } = req.body;
  const role = 'player';
  // 基本驗證
  if (!username || !password || !password2 || !email) {
    return res.redirect('/register?error=' + encodeURIComponent('請填寫所有欄位'));
  }
  if (password !== password2) {
    return res.redirect('/register?error=' + encodeURIComponent('兩次密碼輸入不一致'));
  }

  // 查詢資料庫，看帳號是否已存在
  pool.query('SELECT * FROM users WHERE Username = ?', [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.redirect('/register?error=' + encodeURIComponent('資料庫錯誤'));
    }

    if (results.length > 0) {
      // 帳號已存在
      return res.redirect('/register?error=' + encodeURIComponent('使用者名稱已存在'));
    }

    // 帳號不存在，插入新使用者 (正式環境請加密密碼)
    pool.query('INSERT INTO users (Username, Password,Email,Role) VALUES (?, ?, ?, ?)', [username, password, email, role], (err, results) => {
      if (err) {
        console.error(err);
        return res.redirect('/register?error=' + encodeURIComponent('註冊失敗'));
      }

      // 註冊成功，導回登入頁並帶成功訊息
      res.redirect('/login?error=' + encodeURIComponent('註冊成功，請登入'));
    });
  });
});

// 論壇首頁（需要登入）
app.get('/forum', (req, res) => {
  if (!req.session.username) return res.redirect('/login');
  const sql = 'SELECT * FROM boards';
  pool.query(sql, (err, results1) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }


    pool.query(`SELECT posts.* , Username, Name, boards.BoardID FROM posts, users, boards WHERE AuthorID = UserID AND posts.BoardID = boards.BoardID ORDER BY 
                CASE 
                WHEN posts.CreationDate >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 0
                ELSE 1
                END ASC,
                (LikeCount*5 + CommentCount*20 + ViewCount) DESC`, [], (err, results) => {
      if (err) {
        console.error(err);
        return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
      }

      res.render('forum', {
        username: req.session.username,
        boards: results1,
        posts: results,
      });
    });
  });

});

app.post('/post/:id/checklike', (req, res) => {
  const postid = req.params.id;
  const username = req.session.username;

  if (!username) {
    return res.status(401).json({ success: false, error: '未登入' });
  }

  // 1. 檢查是否已按過讚
  pool.query(
    'SELECT * FROM likes JOIN users ON users.UserID = likes.UserID WHERE PostID = ? AND users.Username = ?',
    [postid, username],
    (err, results) => {

      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: '資料庫錯誤' });
      }

      pool.query(
        'SELECT posts.LikeCount FROM posts WHERE PostID = ?',
        [postid], (err, results1) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: '資料庫錯誤' });
          }
          if (results.length > 0) {
            return res.status(400).json({ success: true, gooded: true, likeCount: results1[0].LikeCount });
          }
          else {
            return res.status(200).json({ success: true, gooded: false, likeCount: results1[0].LikeCount });
          }
        });


    }
  );
});

app.post('/post/:id/like', (req, res) => {
  const postid = req.params.id;
  const username = req.session.username;
  if (!username) {
    return res.status(401).json({ success: false, error: '未登入' });
  }

  // 1. 檢查是否已按過讚
  pool.query(
    'SELECT * FROM likes JOIN users ON users.UserID = likes.UserID WHERE PostID = ? AND users.Username = ?',
    [postid, username],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: '資料庫錯誤' });
      }

      if (results.length > 0) {
        //取消讚
        pool.query(
          'DELETE FROM likes WHERE PostID = ? AND UserID = (SELECT UserID FROM users WHERE Username = ?)',
          [postid, username],
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ success: false, error: '取消讚失敗' });
            }
            // 3. 查詢目前 LikeCount
            pool.query('SELECT LikeCount FROM posts WHERE PostID = ?', [postid], (err, results) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: '資料庫錯誤' });
              }

              if (results.length === 0) {
                return res.status(404).json({ success: false, error: '找不到文章' });
              }

              const newLikeCount = results[0].LikeCount - 1;

              // 4. 更新 LikeCount
              pool.query('UPDATE posts SET LikeCount = ? WHERE PostID = ?', [newLikeCount, postid], (err) => {
                if (err) {
                  console.error(err);
                  return res.status(500).json({ success: false, error: '更新失敗' });
                }

                // 5. 最後回應成功
                return res.json({ success: true, likeCount: newLikeCount, do: false });
              });
            });
          }
        );
        return;
      }

      // 2. 插入新的讚
      pool.query(
        `INSERT INTO likes (PostID, UserID)
         VALUES (?, (SELECT UserID FROM users WHERE Username = ?))`,
        [postid, username],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: '按讚失敗' });
          }

          // 3. 查詢目前 LikeCount
          pool.query('SELECT LikeCount FROM posts WHERE PostID = ?', [postid], (err, results) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ success: false, error: '資料庫錯誤' });
            }

            if (results.length === 0) {
              return res.status(404).json({ success: false, error: '找不到文章' });
            }

            const newLikeCount = results[0].LikeCount + 1;

            // 4. 更新 LikeCount
            pool.query('UPDATE posts SET LikeCount = ? WHERE PostID = ?', [newLikeCount, postid], (err) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: '更新失敗' });
              }

              // 5. 最後回應成功
              return res.json({ success: true, likeCount: newLikeCount, do: true });
            });
          });
        }
      );
    }
  );
});

app.get('/createPost', (req, res) => {
  if (!req.session.username) return res.redirect('/login');
  const sql = 'SELECT * FROM users WHERE Username = ?';
  pool.query(sql, [req.session.username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }
    pool.query("SELECT * FROM boards", (err, results1) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '資料庫錯誤' });
      }
      pool.query("SELECT * FROM tags", (err, results2) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: '資料庫錯誤' });
        }
        return res.render('createPost', {
          username: req.session.username,
          user: results[0],
          boards: results1,
          tags: results2
        });
      });
    });

  });

});
app.post('/createPost',upload.none(), (req, res) => {
  if (!req.session.username) return res.redirect('/login');
  const { title, tag, content, board } = req.body;
  const author = req.session.username;
  let authorId;

  pool.query('SELECT UserID FROM users WHERE Username = ?', [author], (err, results0) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: '資料庫錯誤' });
    }

    authorId = results0[0].UserID;
    pool.query("INSERT INTO posts (Title,Content,AuthorID,BoardID) VALUES (?,?,?,?)", [title, content, authorId, board], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: '資料庫錯誤' });
      }

      const postId = results.insertId;
      pool.query("INSERT INTO posttags (PostID,TagID) VALUES (?,?)", [postId, tag], (err, results1) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, error: '資料庫錯誤' });
        }

        return res.status(200).json({ success: true, postid: postId });
      });

    });
  });


});
app.get('/get-userid', (req, res) => {
  const account = req.session.username;

  if (!account) {
    return res.status(401).json({ error: '尚未登入' });
  }

  const sql = 'SELECT Username FROM users WHERE Username = ? LIMIT 1';
  pool.execute(sql, [account], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    if (results.length > 0) {

      res.json({ userId: results[0].Username });
    } else {
      res.json({ userId: null });
    }
  });
});


app.get('/get-userinfo', (req, res) => {
  const account = req.session.username;

  if (!account) {
    return res.status(401).json({ error: '尚未登入' });
  }

  const sql = 'SELECT * FROM users WHERE Username = ? LIMIT 1';
  pool.execute(sql, [account], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    if (results.length > 0) {
      res.json({
        username: results[0].Username,
        userid: results[0].UserID,
        email: results[0].Email,
        role: results[0].Role,
        level: results[0].Level,
        point: results[0].Points,
        pic: results[0].ProfilePicture,
        bio: results[0].Bio,
        rt: results[0].RegistrationDate,
        lt: results[0].LastLoginDate,
      });
    } else {
      res.json(null);
    }
  });
});
app.get('/get-user-posts', (req, res) => {
  const username = req.session.username;

  if (!username) {
    return res.status(401).json({ error: '尚未登入' });
  }

  const sql = `
    SELECT posts.PostID, posts.Title, posts.CreationDate, boards.Name
    FROM posts
    JOIN users ON posts.AuthorID = users.UserID
    JOIN boards ON posts.BoardID = boards.BoardID
    WHERE users.Username = ?
    ORDER BY posts.CreationDate DESC
  `;

  pool.query(sql, [username], (err, results) => {
    if (err) {
      console.error('取得使用者文章失敗：', err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    res.json(results);
  });
});


app.get('/enter_forum', (req, res) => {
  const gameid = req.query.gameid;
  if (!req.session.username) return res.redirect('/login');
  const sql = 'SELECT * FROM boards';
  pool.query(sql, (err, results1) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }
    pool.query(
      `SELECT posts.*, users.Username, boards.Name, boards.BoardID
        FROM posts
        JOIN users ON posts.AuthorID = users.UserID
        JOIN boards ON posts.BoardID = boards.BoardID
        WHERE boards.BoardID = ?
        ORDER BY posts.LikeCount DESC`,
      [gameid],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
        }

        res.render('forum', {
          username: req.session.username,
          boards: results1,
          posts: results
        });
      }
    );
  });
});

app.get('/search_forum', (req, res) => {
  let keyword = req.query.keyword;
  keyword = `%${keyword}%`;
  if (!req.session.username) return res.redirect('/login');
  const sql = 'SELECT * FROM boards';
  pool.query(sql, (err, results1) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }
    pool.query(
      'SELECT posts.* , users.Username , boards.Name,boards.BoardID AS BoardName FROM posts JOIN users ON posts.AuthorID = users.UserID JOIN boards ON posts.BoardID = boards.BoardID WHERE posts.Title LIKE ?   OR posts.Content LIKE ? ORDER BY posts.LikeCount DESC',
      [keyword, keyword],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
        }

        res.render('forum', {
          username: req.session.username,
          boards: results1,
          posts: results
        });
      }
    );
  });
});

app.get('/post/:id', (req, res) => {
  const postId = req.params.id;

  if (!req.session.username) return res.redirect('/login');

  const sql = `
    SELECT posts.*, users.Username,users.ProfilePicture, boards.Name AS BoardName 
    FROM posts 
    JOIN users ON posts.AuthorID = users.UserID 
    JOIN boards ON posts.BoardID = boards.BoardID 
    WHERE posts.PostID = ?
  `;

  pool.query(sql, [postId], (err, results) => {
    if (err || results.length === 0) {
      console.error(err);
      return res.status(500).send('找不到文章');
    }
    pool.query("UPDATE posts SET ViewCount = ViewCount+1 WHERE posts.PostID = ?", [postId], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: '更新觀看數' });
      }
    });
    pool.query("SELECT comments.* , users.Username , users.ProfilePicture FROM comments , users WHERE comments.PostID = ? AND comments.AuthorID = users.UserID", [postId], (err, results1) => {
      if (err) {
        console.error(err);
        return res.status(500).send('找留言錯誤');
      }

      return res.render('post', {
        username: req.session.username,
        post: results[0],
        comments: results1,
      });

    });



  });
});

app.post('/post/:id/comment', (req, res) => {
  const postId = req.params.id;
  const content = req.body.content;
  const username = req.session.username;

  if (!username) return res.redirect('/login');

  pool.query(
    'INSERT INTO comments (PostID, AuthorID, Content) VALUES (?, (SELECT UserID FROM users WHERE Username = ?), ?)',
    [postId, username, content],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: '留言失敗' });
      }
      pool.query("UPDATE posts SET CommentCount = CommentCount+1 WHERE posts.PostID = ?", [postId], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, error: '更新留言數失敗' });
        }
      });


      return res.redirect(`/post/${postId}`);
    }
  );
});

// 登出
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});



app.listen(PORT, () => {
  console.log(`伺服器啟動 http://localhost:${PORT}`);
});
