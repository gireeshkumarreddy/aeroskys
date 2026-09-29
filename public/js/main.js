// AeroSkys prototype — application entry point.
import { route, start, onBefore, onAfter } from './core/router.js';
import { initHeader, setActiveRoute } from './ui/header.js';
import { renderFooter } from './ui/footer.js';
import { runIntro } from './ui/intro.js';
import { reveal } from './core/dom.js';

const v = name => () => import(`./views/${name}.js`);

// Flights (home) and booking flow
route('/', v('home'));
route('/flights', v('home'));
route('/flights/search', v('flights-results'));
route('/flights/review', v('flight-review'), { flow: true });
route('/flights/addons', v('flight-addons'), { flow: true });
route('/checkout', v('payment'), { flow: true });
route('/booking/:ref', v('booking'));
route('/find-booking', v('find-booking'));
route('/trips', v('trips'));
route('/account', v('account'));

// Hotels
route('/hotels', v('hotels-home'));
route('/hotels/search', v('hotels-results'));
route('/hotels/stay/:id', v('hotel-details'));
route('/hotels/review', v('hotel-review'), { flow: true });

// Holidays
route('/holidays', v('holidays-home'));
route('/holidays/search', v('holiday-search'));
route('/holidays/package/:id', v('package'));

// Bus
route('/bus', v('bus-home'));
route('/bus/search', v('bus-results'));
route('/bus/review', v('bus-review'), { flow: true });

// Services & enquiries
route('/visa', v('visa'));
route('/group-booking', v('group'));
route('/cab', v('cab'));
route('/train', v('train'));
route('/web-checkin', v('web-checkin'));

// Content
route('/offers', v('offers'));
route('/blog', v('blog'));
route('/blog/:slug', v('blog-post'));
route('/support', v('support'));
route('/credits', v('credits'));
for (const p of ['/about', '/terms', '/payment-security', '/privacy', '/cancellation-policy', '/refund-policy']) route(p, v('page'));
route('/404', v('not-found'));

let revealCleanup = null;
onBefore(ctx => {
  document.body.classList.toggle('flow-mode', !!ctx.opts.flow);
  document.body.classList.remove('has-mobile-cta');
  setActiveRoute(ctx.path);
});
onAfter(() => {
  revealCleanup?.();
  revealCleanup = reveal(document.getElementById('main'));
  document.getElementById('main').focus({ preventScroll: true });
});

initHeader();
renderFooter();
start();

// The opening plays over the home page once the masthead exists.
if (document.documentElement.classList.contains('intro-pending')) {
  // Background tabs never run animation frames; release the page instead of waiting.
  if (document.hidden) window.aeroskysIntroBoot?.release();
  else requestAnimationFrame(() => requestAnimationFrame(runIntro));
}
