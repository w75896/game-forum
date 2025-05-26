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
const { request } = require('http');
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
    req.session.userid = results[0].UserID;
    req.session.role = results[0].Role;

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
// 訪客登入路由
app.get('/guest-login', (req, res) => {
  const guestUsername = 'GUEST';
  const guestPassword = '無';

  pool.query('SELECT * FROM users WHERE Username = ?', [guestUsername], (err, results) => {
    if (err) {
      console.error(err);
      return res.redirect('/login?error=' + encodeURIComponent('資料庫錯誤'));
    }

    if (results.length === 0 || results[0].Password !== guestPassword) {
      return res.redirect('/login?error=' + encodeURIComponent('訪客帳號不存在或密碼錯誤'));
    }

    // 訪客登入成功
    req.session.username = guestUsername;
    req.session.userid = results[0].UserID;
    req.session.role = results[0].Role;

    // 更新最後登入時間
    pool.query(
      'UPDATE users SET LastLoginDate = NOW() WHERE Username = ?',
      [guestUsername],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.redirect('/login?error=' + encodeURIComponent('訪客登入時更新時間失敗'));
        }
        res.redirect('/forum');
      }
    );
  });
});
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log('登出錯誤:', err);
      return res.status(500).send('無法登出');
    }
    res.clearCookie('connect.sid'); // 清除瀏覽器的 session cookie
    res.redirect('/login'); // 導回登入頁或首頁
  });
});
// 註冊頁面
app.get('/register', (req, res) => {
  res.render('register');
});
// 註冊頁面
app.get('/personalfile', (req, res) => {
  if (!req.session.username) return res.redirect('/login');
  const username = req.session.username;
  const sql = 'SELECT * FROM boards';
  pool.query(sql, (err, results1) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }
    pool.query(`SELECT posts.PostID,comments.Content,users.Username,notifications.* ,posts.Title AS postname FROM users,comments,posts,notifications WHERE notifications.UserID=? AND posts.PostID = RelatedPostID AND RelatedCommentID=CommentID AND comments.AuthorID=users.UserID ORDER BY Timestamp DESC LIMIT 5`, [req.session.userid], (err, results3) => {
      res.render('personalfile', {
        username,
        boards: results1,
        nofica:results3
      });
    });
  });
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


    pool.query(`SELECT posts.* ,tags.Name AS tag, Username,ProfilePicture , boards.Name, boards.BoardID 
                FROM tags, posttags,posts, users, boards WHERE tags.TagID = posttags.TagID AND posts.PostID = posttags.PostID AND AuthorID = UserID AND posts.BoardID = boards.BoardID ORDER BY 
                CASE 
                WHEN posts.CreationDate >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 0
                ELSE 1
                END ASC,
                (LikeCount*5 + CommentCount*20 + ViewCount) DESC`, [], (err, results) => {
      if (err) {
        console.error(err);
        return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
      }
      pool.query(`SELECT tags.* FROM tags`, [], (err, results2) => {
        if (err) {
          console.error(err);
          return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
        }
        pool.query(`SELECT posts.PostID,comments.Content,users.Username,notifications.* ,posts.Title AS postname FROM users,comments,posts,notifications WHERE notifications.UserID=? AND posts.PostID = RelatedPostID AND RelatedCommentID=CommentID AND comments.AuthorID=users.UserID ORDER BY Timestamp DESC LIMIT 5`, [req.session.userid], (err, results3) => {
          res.render('forum', {
            username: req.session.username,
            boards: results1,
            posts: results,
            Tags: results2,
            query: req.query,
            nofica:results3
          });
        });
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
  if (req.session.role === "guest") {
    return res.status(401).json({ error: '權限不足' });
  }
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
app.post('/createPost', upload.none(), (req, res) => {
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
app.post('/delete_post/:id', (req, res) => {
  const postId = req.params.id;
  const username = req.session.username;
  if (!username) return res.redirect('/login');

  const checkSql = `
    SELECT posts.*, users.Username, boards.ModeratorID
    FROM posts 
    JOIN users ON posts.AuthorID = users.UserID 
    JOIN boards ON posts.BoardID = boards.BoardID
    WHERE posts.PostID = ?
  `;

  pool.query(checkSql, [postId], (err, postResults) => {
    if (err) {
      console.error(err);
      return res.status(500).send('伺服器錯誤');
    }

    if (postResults.length === 0) {
      return res.status(404).send('找不到該文章');
    }

    const post = postResults[0];

    const userSql = 'SELECT * FROM users WHERE Username = ?';
    pool.query(userSql, [username], (err, userResults) => {
      if (err) {
        console.error(err);
        return res.status(500).send('伺服器錯誤');
      }

      const user = userResults[0];

      const isOwner = post.Username === username;
      const isAdmin = user.Role === 'administrator';
      const isModerator = post.ModeratorID === user.UserID;

      if (!isOwner && !isAdmin && !isModerator) {
        return res.status(403).send('無權刪除別人的文章');
      }

      const deleteTagSql = 'DELETE FROM posttags WHERE PostID = ?';
      const deleteComSql = 'DELETE FROM comments WHERE PostID = ?';
      const deleteLikeSql = 'DELETE FROM likes WHERE PostID = ?';
      const deletePostSql = 'DELETE FROM posts WHERE PostID = ?';

      pool.query(deleteTagSql, [postId], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send('刪除標籤失敗');
        }
        pool.query(deleteComSql, [postId], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).send('刪除留言失敗');
          }
          pool.query(deleteLikeSql, [postId], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).send('刪除按讚失敗');
            }
            pool.query(deletePostSql, [postId], (err) => {
              if (err) {
                console.error(err);
                return res.status(500).send('刪除文章失敗');
              }

              res.redirect('/forum');
            });
          });
        });
      });
    });
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
app.post('/update-bio', (req, res) => {
  const account = req.session.username;
  const { bio } = req.body;

  if (!account) {
    return res.status(401).json({ error: '尚未登入' });
  }

  const sql = 'UPDATE users SET Bio = ? WHERE Username = ?';
  pool.execute(sql, [bio, account], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    res.json({ success: true });
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
app.get('/get-user-favorites', (req, res) => {
  const username = req.session.username;
  if (!username) {
    return res.status(401).json({ error: '尚未登入' });
  }

  const sql = `
    SELECT posts.PostID, posts.Title, posts.CreationDate, boards.Name 
    FROM collections
    JOIN posts ON collections.PostID = posts.PostID
    JOIN boards ON posts.BoardID = boards.BoardID
    JOIN users ON collections.UserID = users.UserID
    WHERE users.Username = ?
    ORDER BY posts.CreationDate DESC
  `;

  pool.query(sql, [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '取得收藏文章失敗' });
    }
    res.json(results);
  });
});
app.post('/favorite/:id', (req, res) => {
  const userId = req.session.userid;
  const postId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: '請先登入' });
  }
  const checkSql = 'SELECT * FROM collections WHERE UserID = ? AND PostID = ?';
  const insertSql = 'INSERT INTO collections (UserID, PostID) VALUES (?, ?)';
  const deleteSql = 'DELETE FROM collections WHERE UserID = ? AND PostID = ?';

  pool.query(checkSql, [userId, postId], (err, results) => {
    if (err) {
      console.error('查詢收藏紀錄失敗:', err);
      return res.status(500).json({ error: '伺服器錯誤' });
    }

    if (results.length > 0) {
      pool.query(deleteSql, [userId, postId], (delErr, delResult) => {
        if (delErr) {
          console.error('取消收藏失敗:', delErr);
          return res.status(500).json({ error: '取消收藏失敗' });
        }
        return res.json({ success: true, action: 'deleted' });
      });
    } else {
      pool.query(insertSql, [userId, postId], (insErr, insResult) => {
        if (insErr) {
          console.error('加入收藏失敗:', insErr);
          return res.status(500).json({ error: '加入收藏失敗' });
        }
        return res.json({ success: true, action: 'inserted' });
      });
    }
  });
});
app.get('/get-user-favorites/:id', (req, res) => {
  const userId = req.session.userid;
  const postId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: '請先登入' });
  }

  const sql = `
    SELECT * FROM collections WHERE UserID = ? AND PostID = ?
  `;

  pool.query(sql, [userId, postId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '取得收藏失敗' });
    }

    if (results.length > 0) {
      return res.json({ if: "yes" });
    } else {
      return res.json({ if: "no" }); 
    }
  });
});
app.post('/edit/:id', (req, res) => {
  const username = req.session.username;
  const postId = req.params.id;

  if (!username) {
    return res.redirect("/login");
  }

  // 查詢文章與作者名稱
  const checkSql = `
    SELECT posts.*, users.Username, boards.ModeratorID
    FROM posts 
    JOIN users ON posts.AuthorID = users.UserID 
    JOIN boards ON posts.BoardID = boards.BoardID
    WHERE posts.PostID = ?
  `;

  pool.query(checkSql, [postId], (err, postResults) => {
    if (err) {
      console.error(err);
      return res.status(500).send('伺服器錯誤');
    }

    if (postResults.length === 0) {
      return res.status(404).send('找不到該文章');
    }

    const post = postResults[0];

    // 查詢目前登入的使用者資料
    const sql = 'SELECT * FROM users WHERE Username = ?';
    pool.query(sql, [username], (err, userResults) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '資料庫錯誤' });
      }

      const user = userResults[0];

      const isOwner = post.Username === username;
      const isAdmin = user.Role === "administrator";
      const isModerator = post.ModeratorID === user.UserID;

      if (!isOwner && !isAdmin && !isModerator) {
        return res.status(403).send('無權編輯別人的文章');
      }


      pool.query("SELECT * FROM boards", (err, boards) => {
        if (err) return res.status(500).json({ error: '資料庫錯誤' });

        pool.query("SELECT * FROM tags", (err, tags) => {
          if (err) return res.status(500).json({ error: '資料庫錯誤' });

          pool.query(`
            SELECT tags.Name AS tag, posttags.TagID, posts.*, boards.Name AS BoardName, boards.BoardID 
            FROM tags
            JOIN posttags ON tags.TagID = posttags.TagID
            JOIN posts ON posttags.PostID = posts.PostID
            JOIN boards ON posts.BoardID = boards.BoardID
            WHERE posts.PostID = ?
          `, [postId], (err, finalPostResults) => {
            if (err) return res.status(500).json({ error: '資料庫錯誤' });

            return res.render("edit", {
              username: username,
              user: user,
              boards: boards,
              tags: tags,
              post: finalPostResults[0]
            });
          });
        });
      });
    });
  });
});
app.post('/updatePost/:id', upload.none(), (req, res) => {
  const username = req.session.username;
  const postid = req.params.id;
  const { title, tag, content, board } = req.body;

  if (!username) {
    return res.redirect("/login");
  }

  const checkSql = `
    SELECT posts.*, users.Username, boards.ModeratorID
    FROM posts 
    JOIN users ON posts.AuthorID = users.UserID 
    JOIN boards ON posts.BoardID = boards.BoardID
    WHERE posts.PostID = ?
  `;

  pool.query(checkSql, [postid], (err, postResults) => {
    if (err) {
      console.error(err);
      return res.status(500).send('伺服器錯誤');
    }

    if (postResults.length === 0) {
      return res.status(404).send('找不到該文章');
    }

    const post = postResults[0];

    const userSql = `SELECT * FROM users WHERE Username = ?`;
    pool.query(userSql, [username], (err, userResults) => {
      if (err) {
        console.error(err);
        return res.status(500).send('伺服器錯誤');
      }

      const user = userResults[0];

      const isOwner = post.Username === username;
      const isAdmin = user.Role === "administrator";
      const isModerator = post.ModeratorID === user.UserID;

      if (!isOwner && !isAdmin && !isModerator) {
        return res.status(403).send('無權編輯別人的文章');
      }


      const updatePostSql = `
        UPDATE posts SET Title = ?, Content = ?, BoardID = ? WHERE PostID = ?
      `;
      pool.query(updatePostSql, [title, content, board, postid], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: '更新文章失敗' });
        }

        const updateTagSql = `
          UPDATE posttags SET TagID = ? WHERE PostID = ?
        `;
        pool.query(updateTagSql, [tag, postid], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: '更新標籤失敗' });
          }

          return res.json({ success: true, postid: postid });
        });
      });
    });
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
      `SELECT 
      posts.*,
      tags.Name AS tag,
      users.Username,
      users.ProfilePicture,
      boards.Name AS BoardName,
      boards.BoardID
      FROM posts
      JOIN posttags ON posts.PostID = posttags.PostID
      JOIN tags ON posttags.TagID = tags.TagID
      JOIN users ON posts.AuthorID = users.UserID
      JOIN boards ON posts.BoardID = boards.BoardID
      WHERE boards.BoardID = ?
      ORDER BY posts.LikeCount DESC;`,
      [gameid],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
        }
        pool.query(`SELECT tags.* FROM tags`, [], (err, results2) => {
          if (err) {
            console.error(err);
            return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
          }
          pool.query(`SELECT posts.PostID,comments.Content,users.Username,notifications.* ,posts.Title AS postname FROM users,comments,posts,notifications WHERE notifications.UserID=? AND posts.PostID = RelatedPostID AND RelatedCommentID=CommentID AND comments.AuthorID=users.UserID ORDER BY Timestamp DESC LIMIT 5`, [req.session.userid], (err, results3) => {
            res.render('forum', {
              username: req.session.username,
              boards: results1,
              posts: results,
              Tags: results2,
              query: req.query,
              nofica:results3
            });
          });
        });
      });
  });
});
app.get('/search_forum', (req, res) => {
  if (!req.session.username) return res.redirect('/login');

  let keyword = req.query.keyword || '';
  let tag = req.query.tag || '';
  let time = req.query.time || '0';
  let board = req.query.board || '';

  keyword = `%${keyword}%`;

  // 先撈 boards
  pool.query('SELECT * FROM boards', (err, boardsResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    // 建立主查詢 SQL 與條件
    let sql = `
      SELECT 
        posts.*, 
        tags.Name AS tag, 
        users.ProfilePicture, 
        users.Username, 
        boards.Name AS BoardName
      FROM posts
      JOIN posttags ON posts.PostID = posttags.PostID
      JOIN tags ON tags.TagID = posttags.TagID
      JOIN users ON posts.AuthorID = users.UserID
      JOIN boards ON posts.BoardID = boards.BoardID
      WHERE (posts.Title LIKE ? OR posts.Content LIKE ?)
    `;

    const params = [keyword, keyword];

    // 若前端有傳 board ID，加入條件
    if (board !== '') {
      sql += ' AND posts.BoardID = ?';
      params.push(board);
    }

    // 若前端有傳 tag ID，加入條件
    if (tag !== '') {
      sql += ' AND tags.TagID = ?';
      params.push(tag);
    }

    // 若前端有傳時間篩選，加入條件
    if (time !== '0') {
      let interval = '';
      switch (time) {
        case '1day': interval = 'INTERVAL 1 DAY'; break;
        case '7days': interval = 'INTERVAL 7 DAY'; break;
        case '30days': interval = 'INTERVAL 30 DAY'; break;
        case '1year': interval = 'INTERVAL 1 YEAR'; break;
        case '3years': interval = 'INTERVAL 3 YEAR'; break;
        case '5years': interval = 'INTERVAL 5 YEAR'; break;
      }
      if (interval) {
        sql += ` AND posts.CreationDate >= NOW() - ${interval}`;
      }
    }

    sql += ' ORDER BY posts.LikeCount DESC';

    // 查詢貼文
    pool.query(sql, params, (err, postsResult) => {
      if (err) {
        console.error(err);
        return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
      }

      // 查詢 tag 資料
      pool.query('SELECT * FROM tags', (err, tagsResult) => {
        if (err) {
          console.error(err);
          return res.redirect('/register?error=' + encodeURIComponent('文章載入失敗'));
        }
        pool.query(`SELECT posts.PostID,comments.Content,users.Username,notifications.* ,posts.Title AS postname FROM users,comments,posts,notifications WHERE notifications.UserID=? AND posts.PostID = RelatedPostID AND RelatedCommentID=CommentID AND comments.AuthorID=users.UserID ORDER BY Timestamp DESC LIMIT 5`, [req.session.userid], (err, results3) => {
          res.render('forum', {
            username: req.session.username,
            boards: boardsResult,
            posts: postsResult,
            Tags: tagsResult,
            query: req.query,
            nofica:results3
          });
        });
      });
    });
  });
});
app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  if (!req.session.username) return res.redirect('/login');
  const sql = `
    SELECT posts.*, tags.Name AS tag, users.Username, users.ProfilePicture, boards.Name AS BoardName ,boards.ModeratorID
    FROM posts
    JOIN posttags ON posts.PostID = posttags.PostID
    JOIN tags ON posttags.TagID = tags.TagID
    JOIN users ON posts.AuthorID = users.UserID
    JOIN boards ON posts.BoardID = boards.BoardID
    WHERE posts.PostID = ?;`;

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
        userid: req.session.userid,
        role: req.session.role,

      });
    });
  });
});
app.post('/post/:id/comment', (req, res) => {
  const postId = req.params.id;
  const content = req.body.content;
  const username = req.session.username;
  const postAuthor = req.body.postAuthor;
  if (!username) return res.redirect('/login');

  pool.query(
    'INSERT INTO comments (PostID, AuthorID, Content) VALUES (?, (SELECT UserID FROM users WHERE Username = ?), ?)',
    [postId, username, content],
    (err,result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: '留言失敗' });
      }
      let cid=result.insertId;
      if(postAuthor!==username){
        pool.query('INSERT INTO notifications (UserID, RelatedPostID , RelatedCommentID) VALUES ((SELECT UserID FROM users,posts WHERE posts.PostID= ? AND users.UserID = posts.AuthorID),?,?)',[postId, postId, cid],(err) => {});
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
