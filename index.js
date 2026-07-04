
// const defaultActionUrl = "https://formspree.io/f/xzbnelwk";
const defaultActionUrl = window.SNDIAN_FORM_ACTION_URL;

// tiny toast/modal helper (no external libs)
function showToast(text, type = 'info', timeout = 4000) {
	// types: info, success, error
	const containerId = 'sndian-toast-container';
	let container = document.getElementById(containerId);
	if (!container) {
		container = document.createElement('div');
		container.id = containerId;
		Object.assign(container.style, {
			position: 'fixed',
			top: '16px',
			right: '16px',
			zIndex: 99999,
			display: 'flex',
			flexDirection: 'column',
			gap: '8px',
			alignItems: 'flex-end'
		});
		document.body.appendChild(container);
	}

	const toast = document.createElement('div');
	toast.className = 'sndian-toast sndian-toast-' + type;
	Object.assign(toast.style, {
		minWidth: '200px',
		maxWidth: '360px',
		background: type === 'success' ? '#0b8a3e' : type === 'error' ? '#b00020' : '#323232',
		color: 'white',
		padding: '12px 14px',
		borderRadius: '6px',
		boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
		opacity: '0',
		transform: 'translateY(-6px)',
		transition: 'opacity 240ms ease, transform 240ms ease',
		fontFamily: 'system-ui, sans-serif',
		fontSize: '14px'
	});
	toast.textContent = text;
	container.appendChild(toast);

	// trigger enter
	requestAnimationFrame(() => {
		toast.style.opacity = '1';
		toast.style.transform = 'translateY(0)';
	});

	const hide = () => {
		toast.style.opacity = '0';
		toast.style.transform = 'translateY(-6px)';
		setTimeout(() => { try { toast.remove(); } catch (e) {} }, 260);
	};

	const t = setTimeout(hide, timeout);
	toast.addEventListener('click', () => { clearTimeout(t); hide(); });
	return { hide };
}

// Attach submit handlers to all forms matching .sndian-form
document.addEventListener('DOMContentLoaded', () => {
	const forms = document.querySelectorAll('.sndian-form');
	forms.forEach(form => {
		form.addEventListener('submit', async (e) => {
			e.preventDefault();

			// collect form controls more robustly (inputs, textareas, selects)
			const controls = Array.from(form.querySelectorAll('input, textarea, select'));
			const fd = new FormData();

			controls.forEach(control => {
				if (control.disabled) return;
				// determine a name key: prefer name, then id, then data-original-id or data-original-for
				// If none present, fall back to the input type or tag name so variables sent use the input type (e.g. email -> 'email')
				const tag = (control.tagName || '').toLowerCase();
				const type = (control.type || '').toLowerCase();
				let name = `${control.type} - ${control.id}`;
                console.log(name);
				if (!name) return; // skip if no usable key
				if (type === 'button' || type === 'submit' || type === 'reset' || type === 'image') return;

				if (type === 'checkbox' || type === 'radio') {
					if (control.checked) fd.append(name, control.value);
					return;
				}

				if (control.tagName.toLowerCase() === 'select') {
					Array.from(control.options).forEach(opt => { if (opt.selected) fd.append(name, opt.value); });
					return;
				}

				// files
				if (type === 'file') {
					Array.from(control.files || []).forEach(file => fd.append(name, file));
					return;
				}

				fd.append(name, control.value || '');
			});

			try {
				const res = await fetch(defaultActionUrl, {
					method: 'POST',
					body: fd,
					headers: {
						// Let browser set content-type for FormData
						'Accept': 'application/json'
					}
				});

				let payload = null;
				try { payload = await res.json(); } catch (e) { /* ignore parse errors */ }

				if (res.ok) {
					// show fixed success message, reset, and dispatch
					showToast('Your message was posted.', 'success');
					form.reset();
					form.dispatchEvent(new CustomEvent('sndian:submitted', { detail: { response: res, payload } }));
					// do NOT redirect
				} else {
					// show fixed error message
					showToast('Failed to post your message.', 'error');
					form.dispatchEvent(new CustomEvent('sndian:submit-error', { detail: { response: res, payload } }));
				}
			} catch (err) {
				showToast('Failed to post your message.', 'error');
				form.dispatchEvent(new CustomEvent('sndian:submit-error', { detail: { error: err } }));
			}
		});
	});
});