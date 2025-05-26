const urlParams = new URLSearchParams(window.location.search);
let gameid = urlParams.get("gameid");
if (!gameid) {
    gameid = 0;
}
const act = document.getElementById(`li${gameid}`);
act.classList.add("active");

document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-userid', {
        method: 'GET',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            if (data.userId) {
                document.getElementById('playerId').textContent = data.userId;
            } else if (data.error) {
                document.getElementById('playerId').textContent = data.error;
            } else {
                alert(data.error);
                window.location.href = '/login'
            }
        })
        .catch(err => {
            alert(data.error);
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
                link.href = `/post/${post.PostID}`;
                link.textContent = `[${post.Name}] ${post.Title} - ${new Date(post.CreationDate).toLocaleDateString()}`;
                li.appendChild(link);
                postList.appendChild(li);
            });
        })
        .catch(err => {
            console.error('載入文章失敗：', err);
        });
    fetch('/get-user-favorites', {
        method: 'GET',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(favs => {
            const favList = document.getElementById('userFav');
            if (!favList) return;

            favList.innerHTML = '';

            if (!favs || favs.length === 0) {
                favList.innerHTML = '<li>尚未收藏任何文章。</li>';
                return;
            }

            favs.forEach(post => {
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.href = `/post/${post.PostID}`;
                link.textContent = `[${post.Name}] ${post.Title} - ${new Date(post.CreationDate).toLocaleDateString()}`;
                li.appendChild(link);
                favList.appendChild(li);
            });
        })
        .catch(err => {
            console.error('載入收藏文章失敗：', err);
        });
});
document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-userinfo', {
        method: 'GET',
        credentials: 'include'
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
            if (data.pic == null) {
                document.getElementById('pic').src = "https://imgs.gotrip.hk/wp-content/uploads/2017/11/nhv4dxh3MJN7gxp/blank-profile-picture-973460_960_720_2583405935a02dfab699c6.png";
            }
            else {
                document.getElementById('pic').src = data.pic;
            }
            const bioElement = document.getElementById('bio');
            if (data.bio && data.bio.trim() !== '') {
                bioElement.textContent = data.bio;
            } else {
                bioElement.innerHTML = '<span class="bio-empty">尚未填寫簡介</span>';
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('playerId').textContent = '讀取錯誤';
        });
});
const avatarBox = document.querySelector('.avatar-box');
const avatarDropdown = avatarBox.querySelector('.avatar-dropdown');
avatarBox.addEventListener('mouseenter', () => {
    avatarDropdown.style.display = 'block';
    console.log('hover');
});
const dropdown = document.querySelector('.avatar-dropdown');
dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
});
avatarBox.addEventListener('mouseleave', () => {
    avatarDropdown.style.display = 'none';
});


function editBio() {
    const currentBio = document.getElementById('bio').textContent;
    const currentBioText = currentBio === '尚未填寫簡介' ? '' : currentBio;

    const newBio = prompt('請輸入新的簡介:', currentBioText);

    if (newBio !== null) {
        updateBio(newBio);
    }
}


async function updateBio(newBio) {
    try {
        const response = await fetch('/update-bio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bio: newBio })
        });

        if (response.ok) {
            const bioElement = document.getElementById('bio');
            if (newBio && newBio.trim() !== '') {
                bioElement.textContent = newBio;
            } else {
                bioElement.innerHTML = '<span class="bio-empty">尚未填寫簡介</span>';
            }
            alert('簡介更新成功！');
        } else {
            alert('更新簡介失敗，請稍後再試。');
        }
    } catch (error) {
        console.error('更新簡介時發生錯誤:', error);
        alert('更新簡介時發生錯誤，請稍後再試。');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();

            if (confirm('確定要登出嗎？')) {
                logout();
            }
        });
    }

    const avatarBox = document.getElementById('toper');
    if (avatarBox && dropdown) {
        avatarBox.addEventListener('click', function (e) {
            e.stopPropagation();
            if (dropdown.style.display === 'none' || dropdown.style.display === '') {
                dropdown.style.display = 'block';
            } else {
                dropdown.style.display = 'none';
            }
        });
        document.addEventListener('click', function () {
            dropdown.style.display = 'none';
        });
    }
});

function logout() {
    try {
        location.replace("/logout");
    } catch (error) {
        console.error('登出過程發生錯誤:', error);
        location.replace("/logout");
    }
}
const nofi = document.querySelector('#nofi');
const noarea = nofi.querySelector('#noarea');
nofi.addEventListener('mouseenter', () => {
  noarea.style.display = 'block';
});

nofi.addEventListener('mouseleave', () => {
  // 使用 setTimeout 加延遲防止 hover 太快關閉
  setTimeout(() => {
    if (!noarea.matches(':hover') && !nofi.matches(':hover')) {
      noarea.style.display = 'none';
    }
  }, 200);
});

noarea.addEventListener('mouseleave', () => {
  // 如果滑鼠離開了通知區與觸發區，就隱藏
  setTimeout(() => {
    if (!nofi.matches(':hover')) {
      noarea.style.display = 'none';
    }
  }, 300);
});