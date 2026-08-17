document.addEventListener('DOMContentLoaded', () => {
  // State variables
  let selectedStyle = 'Photorealistic';
  let selectedAspect = '1:1';
  let isGenerating = false;
  let timerInterval = null;
  let startTime = 0;

  // DOM Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const pipelineForm = document.getElementById('pipelineForm');
  const topicInput = document.getElementById('topicInput');
  const stylePresets = document.getElementById('stylePresets');
  const aspectSelector = document.getElementById('aspectSelector');
  const channelSelect = document.getElementById('channelSelect');
  const recipientInput = document.getElementById('recipientInput');
  const recipientLabel = document.getElementById('recipientLabel');
  const recipientHelp = document.getElementById('recipientHelp');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnSubmitText = document.getElementById('btnSubmitText');

  // Status & Telemetry elements
  const statusPlaceholder = document.getElementById('statusPlaceholder');
  const pipelineLoader = document.getElementById('pipelineLoader');
  const loaderPhaseText = document.getElementById('loaderPhaseText');
  const loaderSubText = document.getElementById('loaderSubText');
  const timerValue = document.getElementById('timerValue');
  const progressFill = document.getElementById('progressFill');
  const pipelineResult = document.getElementById('pipelineResult');
  const resultImage = document.getElementById('resultImage');
  const downloadBtn = document.getElementById('downloadBtn');
  const btnViewCards = document.getElementById('btnViewCards');
  const resProvider = document.getElementById('resProvider');
  const resSpeed = document.getElementById('resSpeed');
  const resDispatchStatus = document.getElementById('resDispatchStatus');
  const totalTimeTag = document.getElementById('totalTimeTag');

  // Cards elements
  const cardTelegramImg = document.getElementById('cardTelegramImg');
  const cardTelegramCaption = document.getElementById('cardTelegramCaption');
  const cardEmailImg = document.getElementById('cardEmailImg');
  const cardEmailTopic = document.getElementById('cardEmailTopic');
  const cardEmailStyle = document.getElementById('cardEmailStyle');

  // Optimizer elements
  const optTopicInput = document.getElementById('optTopicInput');
  const optStyleSelect = document.getElementById('optStyleSelect');
  const optAspectSelect = document.getElementById('optAspectSelect');
  const btnRunOptimizer = document.getElementById('btnRunOptimizer');
  const optResultPrompt = document.getElementById('optResultPrompt');
  const optResultNegative = document.getElementById('optResultNegative');

  // n8n Exporter elements
  const n8nJsonDisplay = document.getElementById('n8nJsonDisplay');
  const btnCopyN8n = document.getElementById('btnCopyN8n');

  // Telemetry elements
  const telemetryTableBody = document.getElementById('telemetryTableBody');
  const logCount = document.getElementById('logCount');
  const healthStatusText = document.getElementById('healthStatusText');
  const uptimeTag = document.getElementById('uptimeTag');

  // Tab switching logic
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // Style preset pill selection
  stylePresets.addEventListener('click', (e) => {
    const pill = e.target.closest('.preset-pill');
    if (!pill) return;
    stylePresets.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedStyle = pill.getAttribute('data-style');
  });

  // Aspect ratio pill selection
  aspectSelector.addEventListener('click', (e) => {
    const pill = e.target.closest('.aspect-pill');
    if (!pill) return;
    aspectSelector.querySelectorAll('.aspect-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedAspect = pill.getAttribute('data-aspect');
  });

  // Channel select update input guidance
  channelSelect.addEventListener('change', () => {
    const channel = channelSelect.value;
    if (channel === 'telegram') {
      recipientLabel.innerHTML = 'Telegram Chat ID / Username <span class="required">*</span>';
      recipientInput.placeholder = 'e.g. 123456789 or @my_channel';
      recipientInput.value = '123456789';
      recipientHelp.textContent = 'Enter a numeric Telegram Chat ID or @username';
    } else {
      recipientLabel.innerHTML = 'Recipient Email Address <span class="required">*</span>';
      recipientInput.placeholder = 'e.g. user@example.com';
      recipientInput.value = 'user@example.com';
      recipientHelp.textContent = 'Enter a valid email address for HTML preview & PNG dispatch';
    }
  });

  // Form submit handler (Primary Pipeline Trigger)
  pipelineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isGenerating) return;

    const topic = topicInput.value.trim();
    const channel = channelSelect.value;
    const recipient = recipientInput.value.trim();

    if (!topic || !recipient) {
      alert('Please fill out all required fields.');
      return;
    }

    // Start timer & UI loading state
    isGenerating = true;
    btnSubmit.disabled = true;
    btnSubmitText.textContent = 'Processing Pipeline...';
    statusPlaceholder.classList.add('hidden');
    pipelineResult.classList.add('hidden');
    pipelineLoader.classList.remove('hidden');

    startTime = Date.now();
    timerValue.textContent = '0.0';
    progressFill.style.width = '10%';
    loaderPhaseText.textContent = 'Optimizing Prompt with AI...';
    loaderSubText.textContent = 'Expanding topic into visual artist instructions...';

    timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      timerValue.textContent = elapsed;

      // Simulated progress bar phases
      if (elapsed > 2.0 && elapsed < 8.0) {
        progressFill.style.width = '45%';
        loaderPhaseText.textContent = 'Synthesizing Visual Asset...';
        loaderSubText.textContent = `Rendering high-fidelity ${selectedStyle} image with ${selectedAspect} ratio...`;
      } else if (elapsed >= 8.0) {
        progressFill.style.width = '85%';
        loaderPhaseText.textContent = 'Dispatching to Delivery Channel...';
        loaderSubText.textContent = `Formatting and sending asset to ${channel.toUpperCase()}: ${recipient}...`;
      }
    }, 100);

    try {
      const response = await fetch('/api/generate-and-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          style_preset: selectedStyle,
          aspect_ratio: selectedAspect,
          delivery: { channel, recipient }
        })
      });

      const data = await response.json();

      clearInterval(timerInterval);
      progressFill.style.width = '100%';

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Pipeline execution failed.');
      }

      // Show result payload
      setTimeout(() => {
        pipelineLoader.classList.add('hidden');
        pipelineResult.classList.remove('hidden');

        const imgUrl = data.data.base64Preview || data.data.imagePreviewUrl;
        resultImage.src = imgUrl;
        downloadBtn.href = imgUrl;

        resProvider.textContent = data.telemetry.provider || 'Pollinations AI';
        resSpeed.textContent = (data.telemetry.generationTimeMs / 1000).toFixed(2) + 's';
        resDispatchStatus.textContent = `${data.data.delivery.status.toUpperCase()} (${channel})`;
        totalTimeTag.textContent = `Total: ${(data.telemetry.totalTimeMs / 1000).toFixed(2)}s`;

        // Update Card Preview tab
        cardTelegramImg.src = imgUrl;
        cardEmailImg.src = imgUrl;
        cardEmailTopic.textContent = topic;
        cardEmailStyle.textContent = selectedStyle;
        cardTelegramCaption.innerHTML = `🎨 <b>Generated Visual Asset</b><br><br>
<b>Topic:</b> ${topic}<br>
<b>Style Preset:</b> ${selectedStyle}<br>
<b>Aspect Ratio:</b> ${selectedAspect} (${data.telemetry.imageDimensions.width}x${data.telemetry.imageDimensions.height})<br>
<b>Latency:</b> ${(data.telemetry.generationTimeMs / 1000).toFixed(2)}s<br><br>
<i>Delivered via Topic-to-Image Automation Pipeline</i>`;

        // Refresh telemetry logs table
        fetchTelemetryHistory();
      }, 300);

    } catch (err) {
      clearInterval(timerInterval);
      pipelineLoader.classList.add('hidden');
      statusPlaceholder.classList.remove('hidden');
      alert(`Error executing pipeline: ${err.message}`);
    } finally {
      isGenerating = false;
      btnSubmit.disabled = false;
      btnSubmitText.textContent = 'Generate & Dispatch Asset';
    }
  });

  btnViewCards.addEventListener('click', () => {
    document.querySelector('.tab-btn[data-tab="tab-preview"]').click();
  });

  // Prompt Optimizer test action
  btnRunOptimizer.addEventListener('click', async () => {
    const topic = optTopicInput.value.trim();
    const style_preset = optStyleSelect.value;
    const aspect_ratio = optAspectSelect.value;

    if (!topic) {
      alert('Please enter a topic to test.');
      return;
    }

    optResultPrompt.textContent = 'Refining prompt with LLM...';
    try {
      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, style_preset, aspect_ratio })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      optResultPrompt.textContent = data.expandedPrompt;
      optResultNegative.textContent = data.negativePrompt;
    } catch (err) {
      optResultPrompt.textContent = `Error: ${err.message}`;
    }
  });

  // Load n8n workflow JSON into Tab 4
  async function loadN8nBlueprint() {
    try {
      const res = await fetch('/n8n/topic_to_image_pipeline.json');
      if (res.ok) {
        const text = await res.text();
        n8nJsonDisplay.textContent = text;
      }
    } catch (e) {
      n8nJsonDisplay.textContent = '// n8n JSON available at file:///n8n/topic_to_image_pipeline.json';
    }
  }

  btnCopyN8n.addEventListener('click', () => {
    navigator.clipboard.writeText(n8nJsonDisplay.textContent);
    btnCopyN8n.textContent = '✅ Copied to Clipboard!';
    setTimeout(() => {
      btnCopyN8n.textContent = '📋 Copy n8n Workflow JSON';
    }, 2000);
  });

  // Fetch telemetry logs history
  async function fetchTelemetryHistory() {
    try {
      const res = await fetch('/api/history');
      if (!res.ok) return;
      const data = await res.json();
      logCount.textContent = data.count;

      if (!data.history || data.history.length === 0) {
        telemetryTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No execution logs recorded yet. Submit a generation request to populate logs.</td></tr>`;
        return;
      }

      telemetryTableBody.innerHTML = data.history.map(item => `
        <tr>
          <td><code style="font-size:11px; color:#38bdf8;">${item.id}</code></td>
          <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
          <td><b>${item.topic}</b></td>
          <td>${item.stylePreset} (${item.aspectRatio})</td>
          <td><span style="text-transform:uppercase; font-size:11px; font-weight:bold;">${item.channel}</span></td>
          <td>${item.recipient}</td>
          <td>${((item.totalExecutionTimeMs || 0) / 1000).toFixed(2)}s</td>
          <td><span class="badge-status ${item.status === 'SUCCESS' ? 'success' : 'failed'}">${item.status}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to fetch telemetry history:', err);
    }
  }

  // Check health status
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        healthStatusText.textContent = 'Pipeline Active';
        uptimeTag.textContent = `Uptime: ${data.uptimeSeconds}s`;
      }
    } catch (err) {
      healthStatusText.textContent = 'Offline';
    }
  }

  // Initial loads
  loadN8nBlueprint();
  fetchTelemetryHistory();
  checkHealth();
  setInterval(checkHealth, 10000);
});
