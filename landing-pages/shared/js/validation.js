/**
 * Pro DentHub - Form Validation
 * Client-side validation for lead capture forms
 */

const FormValidator = {
  // Validation rules
  rules: {
    required: (value) => value.trim() !== '',
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    phone: (value) => /^[\d\s\-\+\(\)]{8,20}$/.test(value) || value === '',
    minLength: (value, min) => value.trim().length >= min,
    maxLength: (value, max) => value.trim().length <= max,
    pattern: (value, pattern) => new RegExp(pattern).test(value),
    checked: (element) => element.checked
  },

  // Error messages
  messages: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    phone: 'Please enter a valid phone number',
    minLength: 'Must be at least {min} characters',
    maxLength: 'Must be no more than {max} characters',
    pattern: 'Please enter a valid value',
    checked: 'You must agree to continue'
  },

  // Validate single field
  validateField: function(field, rules) {
    const value = field.value;
    const fieldName = field.getAttribute('name');
    const errors = [];

    // Check each rule
    Object.keys(rules).forEach(ruleName => {
      const ruleValue = rules[ruleName];

      switch(ruleName) {
        case 'required':
          if (ruleValue && !this.rules.required(value)) {
            errors.push(this.messages.required);
          }
          break;

        case 'email':
          if (ruleValue && value && !this.rules.email(value)) {
            errors.push(this.messages.email);
          }
          break;

        case 'phone':
          if (value && !this.rules.phone(value)) {
            errors.push(this.messages.phone);
          }
          break;

        case 'minLength':
          if (value && !this.rules.minLength(value, ruleValue)) {
            errors.push(this.messages.minLength.replace('{min}', ruleValue));
          }
          break;

        case 'maxLength':
          if (value && !this.rules.maxLength(value, ruleValue)) {
            errors.push(this.messages.maxLength.replace('{max}', ruleValue));
          }
          break;

        case 'pattern':
          if (value && !this.rules.pattern(value, ruleValue)) {
            errors.push(this.messages.pattern);
          }
          break;

        case 'checked':
          if (ruleValue && !this.rules.checked(field)) {
            errors.push(this.messages.checked);
          }
          break;
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Show field error
  showFieldError: function(field, message) {
    field.classList.add('error');
    field.classList.remove('success');

    // Find or create error message element
    let errorElement = field.parentElement.querySelector('.field-error');

    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'field-error';
      field.parentElement.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.classList.add('show');
  },

  // Clear field error
  clearFieldError: function(field) {
    field.classList.remove('error');
    field.classList.add('success');

    const errorElement = field.parentElement.querySelector('.field-error');
    if (errorElement) {
      errorElement.classList.remove('show');
    }
  },

  // Validate entire form
  validateForm: function(form, fieldRules) {
    let isValid = true;
    const errors = {};

    Object.keys(fieldRules).forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (!field) return;

      const result = this.validateField(field, fieldRules[fieldName]);

      if (!result.valid) {
        isValid = false;
        errors[fieldName] = result.errors;
        this.showFieldError(field, result.errors[0]);
      } else {
        this.clearFieldError(field);
      }
    });

    return {
      valid: isValid,
      errors: errors
    };
  },

  // Setup real-time validation
  setupRealtimeValidation: function(form, fieldRules) {
    Object.keys(fieldRules).forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (!field) return;

      // Validate on blur
      field.addEventListener('blur', () => {
        const result = this.validateField(field, fieldRules[fieldName]);

        if (!result.valid) {
          this.showFieldError(field, result.errors[0]);
        } else {
          this.clearFieldError(field);
        }
      });

      // Clear error on input
      field.addEventListener('input', () => {
        if (field.classList.contains('error')) {
          const result = this.validateField(field, fieldRules[fieldName]);
          if (result.valid) {
            this.clearFieldError(field);
          }
        }
      });
    });
  },

  // Sanitize input
  sanitize: function(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  },

  // Get form data as object
  getFormData: function(form) {
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
      data[key] = this.sanitize(value);
    }

    return data;
  }
};

// Export for use in other scripts
window.FormValidator = FormValidator;
