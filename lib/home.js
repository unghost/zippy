var Q = require('q');
var errors = require('restify').errors;

var forms = require('./restforms');
var products = require('./products');
var sellers = require('./sellers');
var trans = require('./trans');
var z = require('./zutil');

var fields = forms.fields;

var purchaseForm = forms.create({
  // This is the transaction token.
  tx: fields.string({
    required: true,
  }),
});


exports.get = function (req, res, next) {
  var activeTrans;
  var product;
  var seller;

  purchaseForm.promise(req)
    .then(function(data) {
      return Q.ninvoke(trans.models, 'findOne', {token: data.tx});
    })
    .then(function(_trans) {
      if (!_trans) {
        throw new errors.NotFoundError('transaction not found');
      }
      activeTrans = _trans;
      if (activeTrans.status !== 'STARTED') {
        console.log('Attempt to start trans ' + activeTrans.token + ' ' +
                    'with status=' + activeTrans.status);
        throw new errors.BadRequestError('transaction cannot be started');
      }
    })
    .then(function() {
      return Q.ninvoke(products.models, 'findOne', {_id: activeTrans.product_id});
    })
    .then(function(_product) {
      if (!_product) {
        throw new Error('Zero matching products for product_id ' +
                        activeTrans.product_id);
      }
      product = _product;
    })
    .then(function() {
      return Q.ninvoke(sellers.models, 'findOne', {_id: product._id});
    })
    .then(function(_seller) {
      if (!_seller) {
        throw new Error('Zero matching sellers for id ' +
                        product._id);
      }
      seller = _seller;
    })
    .then(function() {
      res.send(z.env.render('home/home.html', {
        content: 'the content',
        trans: activeTrans,
        product: product,
        seller: seller,
      }));
      next();
    })
    .fail(function(err) {
      console.log('Error', err);  // fixme: bug 938352
      next(err);
    });
};