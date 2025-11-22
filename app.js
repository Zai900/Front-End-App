// app.js// Vue.js app logic for After-School Activity Club
// Includes lesson list, cart, search, sort, and checkout

new Vue({
  el: '#app',
  data: {
    sitename: "After-School Activity Club",
    showLessons: true, // true = lesson list, false = cart/checkout

    // lesson data
    lessons: lessons, // from classes.js

    // cart holds lesson IDs
    cart: [],

    // search + sort controls
    searchText: "",
    sortAttribute: "subject",
    sortOrder: "asc",

    // checkout form
    checkout: {
      name: "",
      phone: "",
      city: "",
      gift: "No"
    },

    orderSubmitted: false
  },

  computed: {
    cartItemCount() {
      return this.cart.length || "";
    },

    // list of lessons filtered by search
    filteredLessons() {
      const q = this.searchText.toLowerCase();

      // If nothing typed, return all
      if (!q) return this.lessons;

      // "search full text across multiple fields"
      return this.lessons.filter(lesson => {
        const subject = lesson.subject.toLowerCase();
        const location = lesson.location.toLowerCase();
        const priceStr = String(lesson.price).toLowerCase();
        const spacesStr = String(lesson.spaces).toLowerCase();

        return (
          subject.includes(q) ||
          location.includes(q) ||
          priceStr.includes(q) ||
          spacesStr.includes(q)
        );
      });
    },

    // filtered + sorted lessons
    sortedLessons() {
      // copy so we don't mutate original
      let arr = this.filteredLessons.slice();

      const attr = this.sortAttribute;
      const dir = this.sortOrder === "asc" ? 1 : -1;

      arr.sort((a, b) => {
        let A = a[attr];
        let B = b[attr];

        // for strings use localeCompare
        if (typeof A === "string" && typeof B === "string") {
          return A.localeCompare(B) * dir;
        }

        // default numeric compare
        if (A < B) return -1 * dir;
        if (A > B) return 1 * dir;
        return 0;
      });

      return arr;
    },

    // details for cart page
    cartDetails() {
      // count qty per lesson id
      const counts = {};
      this.cart.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });

      // build array of objects with qty
      return this.lessons
        .filter(lesson => counts[lesson.id])
        .map(lesson => {
          return {
            id: lesson.id,
            subject: lesson.subject,
            location: lesson.location,
            price: lesson.price,
            image: lesson.image,
            qty: counts[lesson.id]
          };
        });
    },

    cartTotal() {
      return this.cartDetails.reduce((sum, item) => {
        return sum + item.price * item.qty;
      }, 0);
    },

    // checkout validation:
    // Name must be letters/spaces only.
    // Phone must be digits only.
    isCheckoutValid() {
      const nameOK = /^[A-Za-z\s]+$/.test(this.checkout.name);
      const phoneOK = /^[0-9]+$/.test(this.checkout.phone);
      return (
        nameOK &&
        phoneOK &&
        this.cart.length > 0
      );
    }
  },

  methods: {
    toggleCart() {
      // Only allow going to cart if cart has items OR we're already in cart
      if (this.showLessons === true && this.cart.length === 0) return;
      this.showLessons = !this.showLessons;
      this.orderSubmitted = false; // reset message when toggling
    },

    addToCart(lesson) {
      if (lesson.spaces > 0) {
        this.cart.push(lesson.id);
        lesson.spaces--; // reduce availability by 1
      }
    },

    removeFromCart(lessonId) {
      // find index of this lessonId in cart
      const idx = this.cart.indexOf(lessonId);
      if (idx !== -1) {
        this.cart.splice(idx, 1);
        // restore space
        const lesson = this.lessons.find(l => l.id === lessonId);
        if (lesson) {
          lesson.spaces++;
        }
      }
    },

   submitOrder() {
  if (!this.isCheckoutValid) {
    alert("Please enter valid Name (letters only) and Phone (numbers only).");
    return;
  }

  // show confirmation message for marking D
  this.orderSubmitted = true;

  // === reset ALL lesson spaces back to 5 ===
  this.lessons.forEach(lesson => {
    lesson.spaces = 5;
  });

  // === clear cart ===
  this.cart = [];

  // (optional) log to make sure this runs
  console.log("Order submitted, spaces reset to 5, cart cleared");
},

    // ============ Quantity buttons ============

    inc(lessonId) {
      const lesson = this.lessons.find(l => l.id === lessonId);
      if (lesson && lesson.spaces > 0) {
        this.cart.push(lessonId);
        lesson.spaces--;
      }
    },

    dec(lessonId) {
      this.removeFromCart(lessonId);
    },

    removeAll(lessonId) {
      const lesson = this.lessons.find(l => l.id === lessonId);
      let removed = 0;
      this.cart = this.cart.filter(id => {
        if (id === lessonId) {
          removed++;
          return false;
        }
        return true;
      });
      if (lesson && removed > 0) {
        lesson.spaces += removed;
      }
    },

    // helper for lesson list disable check
    inCartCount(id) {
      return this.cart.filter(i => i === id).length;
    }
  }
});
