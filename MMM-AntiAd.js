Module.register("MMM-AntiAd", {
  defaults: {
    updateInterval: 12 * 60 * 60 * 1000,
    animationSpeed: 1000
  },

  start() {
    this.ad = null;
    this.loading = true;
    this.scheduleUpdate();
  },

  scheduleUpdate() {
    this.getAd();
    setInterval(() => {
      this.getAd();
    }, this.config.updateInterval);
  },

  getAd() {
    this.loading = true;
    this.updateDom(this.config.animationSpeed);
    this.sendSocketNotification("GET_AD", {});
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "AD_RESULT") {
      this.ad = payload;
      this.loading = false;
      this.updateDom(this.config.animationSpeed);
    } else if (notification === "AD_ERROR") {
      this.loading = false;
      this.error = payload;
      this.updateDom(this.config.animationSpeed);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "MMM-AntiAd";

    if (this.loading) {
      wrapper.innerHTML = `<div class="antiad-loading">Generating ad...</div>`;
      return wrapper;
    }

    if (this.error) {
      wrapper.innerHTML = `<div class="antiad-error">Error: ${this.error}</div>`;
      return wrapper;
    }

    if (!this.ad) return wrapper;

    const img = this.ad.imageUrl
      ? `<div class="antiad-image"><img src="${this.ad.imageUrl}" alt="${this.ad.imageQuery}" /></div>`
      : "";

    wrapper.innerHTML = `
      <div class="antiad-format">${this.ad.format}</div>
      <div class="antiad-brand">${this.ad.brandName}</div>
      <div class="antiad-headline">${this.ad.headline}</div>
      ${img}
      <div class="antiad-copy">${this.ad.adCopy}</div>
      <div class="antiad-subjects">${this.ad.subjectA} + ${this.ad.subjectB}</div>
    `;

    return wrapper;
  },

  getStyles() {
    return ["MMM-AntiAd.css"];
  }
});