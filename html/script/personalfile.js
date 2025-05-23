const urlParams = new URLSearchParams(window.location.search);
let gameid = urlParams.get("gameid");
if (!gameid) {
    gameid = 0;
}
const act =  document.getElementById(`li${gameid}`);
act.classList.add("active");

document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-userid', {
    method: 'GET',
    credentials: 'include' // 讓 fetch 送 cookie（session id）
    })
    .then(res => res.json())
    .then(data => {
    if (data.userId) {
        document.getElementById('playerId').textContent = data.userId;
    } else if (data.error) {
        document.getElementById('playerId').textContent = data.error;
    } else {
        document.getElementById('playerId').textContent = '找不到玩家ID';
    }
    })
    .catch(err => {
    console.error(err);
    document.getElementById('playerId').textContent = '讀取錯誤';
    });
});

const PersonalFile = document.getElementsByClassName("avatar-box")[0];

PersonalFile.addEventListener('click', () => {
  console.log("test");
  window.location.href = '../personalfile';
});

PersonalFile.style.backgroundColor = "#ff9900";
const navItems = document.querySelectorAll('.nav-list li');

navItems.forEach(item => {
    item.className = ''; 
});

// 載入使用者發表的文章
document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-user-posts', {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(posts => {
        const postList = document.getElementById('userPosts');

        if (!postList) return;

        if (!posts || posts.length === 0) {
            postList.innerHTML = '<li>尚未發表任何文章。</li>';
            return;
        }
        posts.forEach(post => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = `/post/${post.PostID}`; // 假設你未來會有文章詳情頁
            link.textContent = `[${post.Name}] ${post.Title} - ${new Date(post.CreationDate).toLocaleDateString()}`;
            li.appendChild(link);
            postList.appendChild(li);
        });
    })
    .catch(err => {
        console.error('載入文章失敗：', err);
    });
});
document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-userinfo', {
    method: 'GET',
    credentials: 'include' // 讓 fetch 送 cookie（session id）
    })
    .then(res => res.json())
    .then(data => {
        
        
        document.getElementById('account').textContent = data.username;
        document.getElementById('playerIdDetail').textContent = data.userid;
        document.getElementById('email').textContent = data.email;
        document.getElementById('level').textContent = data.level;
        document.getElementById('regDate').textContent = data.rt;
        document.getElementById('lt').textContent = data.lt;
        document.getElementById('bio').textContent = data.bio;
        document.getElementById('role').textContent = data.role;
        document.getElementById('point').textContent = data.point;
        if(data.pic==null){
            document.getElementById('pic').src = "https://imgs.gotrip.hk/wp-content/uploads/2017/11/nhv4dxh3MJN7gxp/blank-profile-picture-973460_960_720_2583405935a02dfab699c6.png";
        }
        else{
            document.getElementById('pic').src = data.pic;
        }
    })
    .catch(err => {
    console.error(err);
    document.getElementById('playerId').textContent = '讀取錯誤';
    });
});
