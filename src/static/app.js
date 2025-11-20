document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageEl = document.getElementById("message");
  const emailInput = document.getElementById("email");

  function showMessage(text, type = "info") {
    messageEl.textContent = text;
    messageEl.className = ""; // reset classes
    messageEl.classList.add("message", type);
    messageEl.classList.remove("hidden");
    setTimeout(() => {
      messageEl.classList.add("hidden");
    }, 5000);
  }

  function createParticipantsList(participants, activityName) {
    const wrapper = document.createElement("div");
    wrapper.className = "participants";
    const title = document.createElement("h5");
    title.textContent = `Participants (${participants.length})`;
    wrapper.appendChild(title);

    const ul = document.createElement("ul");
    if (participants.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No participants yet — be the first!";
      ul.appendChild(li);
    } else {
      participants.forEach((p) => {
        const li = document.createElement("li");
        li.className = "participant-item";

        const span = document.createElement("span");
        span.className = "participant-email";
        span.textContent = p;

        const btn = document.createElement("button");
        btn.className = "delete-btn";
        btn.title = "Unregister participant";
        btn.setAttribute("data-activity", activityName);
        btn.setAttribute("data-email", p);
        btn.innerHTML = "&times;"; // simple cross icon

        li.appendChild(span);
        li.appendChild(btn);
        ul.appendChild(li);
      });
    }
    wrapper.appendChild(ul);
    return wrapper;
  }

  function renderActivities(data) {
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.entries(data).forEach(([name, info]) => {
      // Card container
      const card = document.createElement("div");
      card.className = "activity-card";

      const title = document.createElement("h4");
      title.textContent = name;
      card.appendChild(title);

      const desc = document.createElement("p");
      desc.textContent = info.description;
      card.appendChild(desc);

      const schedule = document.createElement("p");
      schedule.innerHTML = `<strong>Schedule:</strong> ${info.schedule}`;
      card.appendChild(schedule);

      const capacity = document.createElement("p");
      capacity.innerHTML = `<strong>Capacity:</strong> ${info.participants.length} / ${info.max_participants}`;
      card.appendChild(capacity);

      // Participants list
      const participantsEl = createParticipantsList(info.participants, name);
      card.appendChild(participantsEl);

      activitiesList.appendChild(card);

      // Option for select
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  async function loadActivities() {
    activitiesList.innerHTML = "<p>Loading activities...</p>";
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      renderActivities(data);
    } catch (err) {
      activitiesList.innerHTML = "<p class='error'>Unable to load activities.</p>";
      console.error(err);
    }
  }

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const activity = activitySelect.value;
    if (!email || !activity) {
      showMessage("Please enter an email and select an activity.", "error");
      return;
    }

    try {
      const url = `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = body.detail || body.message || "Signup failed";
        showMessage(detail, "error");
        return;
      }

      showMessage(body.message || "Signed up successfully", "success");

      // Update participants list in the UI without reloading everything:
      // Find the card for this activity and append the new participant.
      const cards = Array.from(document.querySelectorAll(".activity-card"));
      const card = cards.find((c) => c.querySelector("h4")?.textContent === activity);
      if (card) {
        const participantsWrapper = card.querySelector(".participants");
        const ul = participantsWrapper.querySelector("ul");
        // If the "No participants yet" placeholder exists, clear it
        if (ul.children.length === 1 && ul.children[0].textContent.includes("No participants")) {
          ul.innerHTML = "";
        }
        const li = document.createElement("li");
        li.className = "participant-item";

        const span = document.createElement("span");
        span.className = "participant-email";
        span.textContent = email;

        const btn = document.createElement("button");
        btn.className = "delete-btn";
        btn.title = "Unregister participant";
        btn.setAttribute("data-activity", activity);
        btn.setAttribute("data-email", email);
        btn.innerHTML = "&times;";

        li.appendChild(span);
        li.appendChild(btn);
        ul.appendChild(li);

        // update capacity line
        const capacityLine = Array.from(card.querySelectorAll("p")).find(p => p.innerHTML.includes("Capacity:"));
        if (capacityLine) {
          const match = capacityLine.textContent.match(/(\d+)\s*\/\s*(\d+)/);
          if (match) {
            const current = parseInt(match[1], 10) + 1;
            const max = match[2];
            capacityLine.innerHTML = `<strong>Capacity:</strong> ${current} / ${max}`;
          }
        }
      }
      signupForm.reset();
    } catch (err) {
      console.error(err);
      showMessage("Network error while signing up.", "error");
    }
  });

  loadActivities();

  // Delegate click events for delete buttons (unregister)
  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest && ev.target.closest(".delete-btn");
    if (!btn) return;

    const activity = btn.getAttribute("data-activity");
    const email = btn.getAttribute("data-email");
    if (!activity || !email) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const url = `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = body.detail || body.message || "Failed to unregister";
        showMessage(detail, "error");
        return;
      }

      // Show success and reload to display updated counts from server
      showMessage(body.message || `${email} unregistered from ${activity}`, "success");
      // short delay so message is visible, then reload
      setTimeout(() => {
        location.reload();
      }, 300);
    } catch (err) {
      console.error(err);
      showMessage("Network error while unregistering.", "error");
    }
  });
});
