const audio = document.getElementById("audio");
const playlist = document.getElementById("playlist");
const fileInput = document.getElementById("fileInput");

const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const seekBar = document.getElementById("seekBar");
const volumeBar = document.getElementById("volumeBar");
const searchInput = document.getElementById("searchInput");

let songs = [];
let currentIndex = -1;
let shuffle = false;
let repeat = false;
let currentUrl = null;

audio.volume = 0.8;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function renderPlaylist() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => song.name.toLowerCase().includes(query));

  document.getElementById("songCount").textContent = songs.length;

  if (filtered.length === 0) {
    playlist.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♫</div>
        <h3>${songs.length ? "No matching songs" : "Your library starts here"}</h3>
        <p>${songs.length ? "Try another search." : "Add audio files from your device to start listening."}</p>
        ${songs.length ? "" : '<button class="primary-btn" id="emptyUploadBtn">Choose music</button>'}
      </div>`;

    const emptyBtn = document.getElementById("emptyUploadBtn");
    if (emptyBtn) emptyBtn.onclick = () => fileInput.click();
    return;
  }

  playlist.innerHTML = filtered.map(({ song, index }) => `
    <div class="track ${index === currentIndex ? "selected" : ""}"
         data-index="${index}">
      <span class="track-number">${index === currentIndex && !audio.paused ? "♫" : index + 1}</span>
      <div class="track-main" role="button" tabindex="0"
           aria-label="Play ${escapeHTML(song.name)}">
        <div class="track-art">♫</div>
        <div class="track-details">
          <strong>${escapeHTML(song.name)}</strong>
          <span>${index === currentIndex && !audio.paused ? "Now playing" : "Local audio"}</span>
        </div>
      </div>
      <span class="track-time">${formatTime(song.duration)}</span>
    </div>
  `).join("");

  playlist.querySelectorAll(".track-main").forEach((element) => {
    const row = element.closest(".track");
    const index = Number(row.dataset.index);

    element.addEventListener("click", () => playSong(index));
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playSong(index);
      }
    });
  });
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function addFiles(files) {
  const audioFiles = Array.from(files).filter(file =>
    file.type.startsWith("audio/")
  );

  audioFiles.forEach(file => {
    const url = URL.createObjectURL(file);

    const song = {
      name: file.name.replace(/\.[^/.]+$/, ""),
      url,
      duration: 0
    };

    songs.push(song);

    const metadataAudio = new Audio();

    metadataAudio.preload = "metadata";
    metadataAudio.src = url;

    metadataAudio.addEventListener("loadedmetadata", () => {
      song.duration = metadataAudio.duration;

      if (songs.includes(song)) {
        renderPlaylist();
        updateDuration();
      }

      metadataAudio.src = "";
    }, { once: true });

    metadataAudio.addEventListener("error", () => {
      metadataAudio.src = "";
    }, { once: true });
  });

  renderPlaylist();

  if (currentIndex === -1 && songs.length > 0) {
    loadSong(0);
  }
}

function loadSong(index) {
  if (index < 0 || index >= songs.length) return;

  currentIndex = index;
  audio.pause();

  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
  }

  const song = songs[index];
  currentUrl = song.url;
  audio.src = song.url;

  document.getElementById("currentTitle").textContent = song.name;
  document.getElementById("currentArtist").textContent = "Local audio file";
  document.getElementById("miniArt").textContent = "♫";

  seekBar.value = 0;
  document.getElementById("currentTime").textContent = "0:00";
  updateDuration();
  renderPlaylist();
}

async function playSong(index) {
  if (index !== currentIndex || !audio.src) {
    loadSong(index);
  }

  try {
    await audio.play();
  } catch (error) {
    console.error("Playback could not start:", error);
  }

  updatePlayButton();
  renderPlaylist();
}

function togglePlay() {
  if (!songs.length) {
    fileInput.click();
    return;
  }

  if (currentIndex === -1) {
    playSong(0);
    return;
  }

  if (audio.paused) {
    audio.play().catch(console.error);
  } else {
    audio.pause();
  }
}

function nextSong() {
  if (!songs.length) return;

  let nextIndex;

  if (shuffle && songs.length > 1) {
    do {
      nextIndex = Math.floor(Math.random() * songs.length);
    } while (nextIndex === currentIndex);
  } else {
    nextIndex = currentIndex + 1;
  }

  if (nextIndex >= songs.length) {
    if (repeat) {
      nextIndex = 0;
    } else {
      audio.pause();
      audio.currentTime = 0;
      updatePlayButton();
      renderPlaylist();
      return;
    }
  }

  playSong(nextIndex);
}

function previousSong() {
  if (!songs.length) return;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  const previousIndex =
    currentIndex <= 0 ? songs.length - 1 : currentIndex - 1;

  playSong(previousIndex);
}

function updatePlayButton() {
  const playing = !audio.paused;
  playBtn.textContent = playing ? "Ⅱ" : "▶";
  playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  playBtn.title = playing ? "Pause" : "Play";
}

function updateDuration() {
  const duration = Number.isFinite(audio.duration)
    ? audio.duration
    : (songs[currentIndex]?.duration || 0);

  document.getElementById("duration").textContent = formatTime(duration);
}

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = "";
});

document.getElementById("uploadBtn").addEventListener("click", () => fileInput.click());
document.getElementById("emptyUploadBtn")?.addEventListener("click", () => fileInput.click());

document.getElementById("heroPlayBtn").addEventListener("click", () => {
  if (songs.length) togglePlay();
  else fileInput.click();
});

playBtn.addEventListener("click", togglePlay);
prevBtn.addEventListener("click", previousSong);
nextBtn.addEventListener("click", nextSong);

shuffleBtn.addEventListener("click", () => {
  shuffle = !shuffle;
  shuffleBtn.classList.toggle("active", shuffle);
  shuffleBtn.setAttribute("aria-pressed", String(shuffle));
});

repeatBtn.addEventListener("click", () => {
  repeat = !repeat;
  audio.loop = repeat;
  repeatBtn.classList.toggle("active", repeat);
  repeatBtn.setAttribute("aria-pressed", String(repeat));
});

searchInput.addEventListener("input", renderPlaylist);

volumeBar.addEventListener("input", () => {
  audio.volume = Number(volumeBar.value);
});

audio.addEventListener("timeupdate", () => {
  document.getElementById("currentTime").textContent =
    formatTime(audio.currentTime);

  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    seekBar.value = (audio.currentTime / audio.duration) * 100;
  }
});

seekBar.addEventListener("input", () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
  }
});

audio.addEventListener("loadedmetadata", updateDuration);

audio.addEventListener("play", () => {
  updatePlayButton();
  renderPlaylist();
});

audio.addEventListener("pause", () => {
  updatePlayButton();
  renderPlaylist();
});

audio.addEventListener("ended", () => {
  if (!repeat) nextSong();
});

document.getElementById("homeBtn").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("libraryBtn").addEventListener("click", () => {
  document.getElementById("library").scrollIntoView({
    behavior: "smooth"
  });
});

renderPlaylist();
updatePlayButton();
