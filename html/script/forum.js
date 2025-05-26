const urlParams = new URLSearchParams(window.location.search);
let gameid = urlParams.get("gameid");
if (!gameid) {
    gameid = 0;
}
const act = document.getElementById(`li${gameid}`);
const span = act.querySelector('span');
span.classList.add("active");



const PersonalFile = document.querySelector("#toper");

PersonalFile.addEventListener('click', () => {

    window.location.href = '../personalfile';
});
const Create = document.querySelector("#ToCreatePost");

Create.addEventListener('click', () => {
    window.location.href = '../createPost';
});

// 下清單
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

document.querySelectorAll('.post-card').forEach(card => {
    const postid = card.getAttribute('data-post-id');
    card.addEventListener('click', function () {
        // 假設你有加 data-post-id 屬性
        const postId = this.getAttribute('data-post-id');
        if (postId) {
            window.location.href = `/post/${postId}`;
        }
    });
    fetch(`/post/${postid}/checklike`, {
        method: 'POST',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            const likeImg = card.querySelector('.l1');
            if (data.success && data.gooded) {
                likeImg.src = '/img/gooded.png';
            } else if (data.success) {
                likeImg.src = '/img/good.png';
            } else {
                alert(data.error);
                // redirect to /login
                window.location.href = '/login';
            }
        })
        .catch(err => {
            console.error('失敗：', err);
        });

});
document.addEventListener('DOMContentLoaded', function () {
    // 找到登出按鈕並添加點擊事件
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault(); // 防止默認行為

            // 可選：顯示確認對話框
            if (confirm('確定要登出嗎？')) {
                // 執行登出操作並跳轉到登入頁面
                logout();
            }
        });
    }

    // 頭像點擊顯示/隱藏下拉選單
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

        // 點擊其他地方時隱藏下拉選單
        document.addEventListener('click', function () {
            dropdown.style.display = 'none';
        });
    }
});


function logout() {
    try {
        // 直接跳轉到登出 API，讓後端處理 session 清除和重導向
        location.replace("/logout");
    } catch (error) {
        console.error('登出過程發生錯誤:', error);
        // 發生錯誤時仍然跳轉到登入頁面
        location.replace("/logout");
    }
}

