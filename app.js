// app.js — Vue.js logic with quantity + reset ALL spaces to 5 after order

// LOCAL development:
const API_BASE = "http://localhost:5000";
// For deployment to Render.com, change to:
// const API_BASE = "https://zainab-backend.onrender.com";

new Vue({
  el: "#app",

  data: {
    sitename: "After-School Activity Club",

    showLessons: true,        // true = lessons list, false = cart/checkout

    lessons: [],              // loaded from backend
    cart: [],                 // stores lesson IDs (_id from MongoDB)

    searchText: "",
    sortAttribute: "subject",
    sortOrder: "asc",

    checkout: {
      name: "",
      phone: "",
      city: "",
    },

    orderSubmitted: false,
    loadingLessons: false,
    loadError: "",
    submitError: "",
  },

  created() {
    this.fetchLessons();
  },

  computed: {
    cartItemCount() {
      return this.cart.length || "";
    },

    // Search + Sort
    sortedLessons() {
      let list = [...this.lessons];

      const q = this.searchText.trim().toLowerCase();
      if (q) {
        list = list.filter((lesson) => {
          return (
            lesson.subject.toLowerCase().includes(q) ||
            lesson.location.toLowerCase().includes(q) ||
            String(lesson.price).includes(q) ||
            String(lesson.spaces).includes(q)
          );
        });
      }

      list.sort((a, b) => {
        let valA = a[this.sortAttribute];
        let valB = b[this.sortAttribute];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return this.sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return this.sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      return list;
    },

    // Build quantity breakdown from cart IDs
    cartDetails() {
      const counts = {};

      // count how many times each lesson ID appears in cart
      this.cart.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });

      // convert to array with lesson info
      return Object.keys(counts).map((id) => {
        const lesson = this.lessons.find((l) => l._id === id);

        return {
          id,
          subject: lesson ? lesson.subject : "Unknown lesson",
          location: lesson ? lesson.location : "",
          price: lesson ? lesson.price : 0,
          image: lesson ? lesson.image : "",
          qty: counts[id],
        };
      });
    },

    cartTotal() {
      return this.cartDetails.reduce(
        (sum, item) => sum + item.price * item.qty,
        0
      );
    },

    validName() {
      return /^[A-Za-z\s]+$/.test(this.checkout.name.trim());
    },

    validPhone() {
      return /^[0-9]+$/.test(this.checkout.phone.trim());
    },

    isCheckoutValid() {
      return this.validName && this.validPhone && this.cart.length > 0;
    },
  },

  methods: {
    async fetchLessons() {
      try {
        this.loadingLessons = true;
        this.loadError = "";
        const res = await fetch(`${API_BASE}/lessons`);
        if (!res.ok) throw new Error("Failed to load lessons");
        const data = await res.json();
        this.lessons = data;
      } catch (err) {
        console.error(err);
        this.loadError = "Could not load lessons from server.";
      } finally {
        this.loadingLessons = false;
      }
    },

    toggleCart() {
      this.showLessons = !this.showLessons;
    },

    canAddToCart(lesson) {
      return lesson.spaces > 0;
    },

    addToCart(lesson) {
      if (!this.canAddToCart(lesson)) return;
      this.cart.push(lesson._id);
      lesson.spaces--;
    },

    // increase quantity in cart for a given lesson id
    inc(id) {
      const lesson = this.lessons.find((l) => l._id === id);
      if (!lesson || lesson.spaces === 0) return;
      this.cart.push(id);
      lesson.spaces--;
    },

    // decrease quantity in cart for a given lesson id
    dec(id) {
      const index = this.cart.findIndex((cartId) => cartId === id);
      if (index === -1) return;
      this.cart.splice(index, 1);
      const lesson = this.lessons.find((l) => l._id === id);
      if (lesson) lesson.spaces++;
    },

    // remove ALL of one lesson from cart
    removeAll(id) {
      const count = this.cart.filter((cartId) => cartId === id).length;
      if (count === 0) return;
      this.cart = this.cart.filter((cartId) => cartId !== id);
      const lesson = this.lessons.find((l) => l._id === id);
      if (lesson) lesson.spaces += count;
    },

    async submitOrder() {
      this.submitError = "";
      this.orderSubmitted = false;

      if (!this.isCheckoutValid) {
        this.submitError =
          "Please provide a valid name, phone number, and at least one lesson.";
        return;
      }

      try {
        const items = this.cartDetails.map((item) => ({
          lessonId: item.id,
          quantity: item.qty,
        }));

        const orderPayload = {
          name: this.checkout.name.trim(),
          phone: this.checkout.phone.trim(),
          city: this.checkout.city.trim(),
          items,
        };

        // POST /orders
        const res = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || "Failed to submit order");
        }

        // Reset ALL lessons back to 5 spaces via PUT
        for (const lesson of this.lessons) {
          await fetch(`${API_BASE}/lessons/${lesson._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spaces: 5 }),
          });
        }

        this.orderSubmitted = true;
        this.cart = [];
        await this.fetchLessons();

        // Reset form
        this.checkout.name = "";
        this.checkout.phone = "";
        this.checkout.city = "";
      } catch (err) {
        console.error(err);
        this.submitError = err.message || "Failed to submit order.";
      }
    },

    imageSrc(imageName) {
      if (!imageName) {
        return "images/placeholder.jpg";
      }
      return `images/${imageName}`;
    },
  },
});
