import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check, Phone, Tag, MapPin, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PaymentForm from "../components/PaymentForm";
import { placeOrder } from "../store/slices/orderSlice";
import { toggleAuthPopup } from "../store/slices/popupSlice";
import { toast } from "react-toastify";

const Payment = () => {
  const dispatch = useDispatch();
  const { authUser, isCheckingAuth } = useSelector((state) => state.auth);
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!isCheckingAuth && !authUser) {
      toast.info("Please login to proceed to checkout");
      dispatch(toggleAuthPopup());
      navigateTo("/products");
    }
  }, [authUser, isCheckingAuth, navigateTo, dispatch]);

  const { cart } = useSelector((state) => state.cart);
  const { orderStep } = useSelector((state) => state.order);

  const [shippingDetails, setShippingDetails] = useState({
    fullName: "",
    state: "",
    city: "",
    country: "",
    address: "",
    pincode: "",
    phone: "",
  });

  const trimmedCity =
    typeof shippingDetails.city === "string" && shippingDetails.city.trim().length > 0
      ? shippingDetails.city.trim()
      : "";
  const normalizedCity = trimmedCity.toLowerCase();

  const {
    rawSubtotal,
    totalLocationDiscount,
    discountedSubtotal,
    tax,
    shipping,
    finalTotal,
    processedCart,
    availableDiscountCities,
  } = useMemo(() => {
    let rawSub = 0;
    let totalDiscount = 0;
    let discSub = 0;

    const processed = cart.map((item) => {
      const unitPrice = Number(item.product?.price) || 0;
      const itemQty = item.quantity || 1;
      const ruleCity = item.product?.discount_city ? item.product.discount_city.trim() : null;
      const rulePercent = Number(item.product?.discount_percent) || 0;

      const isMatch = !!(
        normalizedCity &&
        ruleCity &&
        normalizedCity === ruleCity.toLowerCase() &&
        rulePercent > 0
      );

      let unitDiscount = 0;
      let finalUnitPrice = unitPrice;
      let itemDiscount = 0;

      if (isMatch) {
        unitDiscount = parseFloat(((unitPrice * rulePercent) / 100).toFixed(2));
        finalUnitPrice = Math.max(0, parseFloat((unitPrice - unitDiscount).toFixed(2)));
        itemDiscount = parseFloat((unitDiscount * itemQty).toFixed(2));
      }

      rawSub += unitPrice * itemQty;
      totalDiscount += itemDiscount;
      discSub += finalUnitPrice * itemQty;

      return {
        ...item,
        unitPrice,
        isMatch,
        ruleCity,
        rulePercent,
        unitDiscount,
        finalUnitPrice,
        itemDiscount,
        lineTotal: finalUnitPrice * itemQty,
        originalLineTotal: unitPrice * itemQty,
      };
    });

    const taxAmount = parseFloat((discSub * 0.18).toFixed(2));
    const shippingFee = discSub >= 50 || discSub === 0 ? 0 : 2;
    const totalWithAll = Math.round(discSub + taxAmount + shippingFee);

    const discountCities = [
      ...new Set(
        cart
          .filter(
            (i) =>
              i.product?.discount_city && Number(i.product?.discount_percent) > 0
          )
          .map((i) => i.product.discount_city.trim())
      ),
    ];

    return {
      rawSubtotal: rawSub,
      totalLocationDiscount: totalDiscount,
      discountedSubtotal: discSub,
      tax: taxAmount,
      shipping: shippingFee,
      finalTotal: totalWithAll,
      processedCart: processed,
      availableDiscountCities: discountCities,
    };
  }, [cart, normalizedCity]);

  // ✅ Properly defined event handler
  const handlePlaceOrder = (e) => {
    e.preventDefault();

    const orderData = {
      full_name: shippingDetails.fullName,
      state: shippingDetails.state,
      city: shippingDetails.city,
      country: shippingDetails.country,
      address: shippingDetails.address,
      pincode: shippingDetails.pincode,
      phone: shippingDetails.phone,
      orderedItems: cart,
    };

    // ✅ Dispatch only when user clicks "Continue to Payment"
    dispatch(placeOrder(orderData));
  };


  if (isCheckingAuth) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center glass-panel max-w-md">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            No Items in Cart.
          </h1>
          <p className="text-muted-foreground mb-8">
            Add some items to your cart before processing to checkout.
          </p>
          <Link
            to={"/products"}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg text-primary-foreground
            gradient-primary hover:glow-on-hover animate-smooth font-semibold"
          >
            Browse Products


          </Link>
        </div>
      </div>
    );
  }

  return (<>
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/**HEADER */}
          <div className="flex items-center space-x-4 mb-8">
            <Link
              to={"/cart"}
              className="p-2 glass-card hover:glow-on-hover animate-smooth"
            >
              <ArrowLeft className="w-5h-5 text-primary" />
            </Link>
          </div>

          {/**PROGRESS STEPS */}

          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center space-x-4">
              {/**STEP 1 */}
              <div
                className={`flex items-center space-x-2 ${orderStep >= 1 ? "text-primary" : "text-muted-foreground"

                  }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${orderStep >= 1
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary"

                  }`}>
                  {orderStep > 1 ? <Check className="w-5 h-5 " /> : "1"}
                </div>
                <span className="font-medium">Details</span>
              </div>

              <div className={`w-12 h-0 ${orderStep >= 2 ? "bg-primary" : "bg-border"

                }`} />

              {/**STEP 2 */}

              <div
                className={`flex items-center space-x-2 ${orderStep >= 2 ? "text-primary" : "text-muted-foreground"

                  }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${orderStep >= 2
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary"

                  }`}>
                  2
                </div>
                <span className="font-medium">Payment</span>
              </div>
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/** FORM SECTION */}
            <div className="lg:col-span-2">
              {orderStep === 1 ? (
                /* STEP 1 : USER DETAILS */
                <form onSubmit={handlePlaceOrder} className="glass-panel">
                  <h2 className="text-xl font-semibold text-foreground mb-6">
                    Shipping Information
                  </h2>
                  <div className="mb-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingDetails.fullName}
                        onChange={(e) => {
                          setShippingDetails({
                            ...shippingDetails,
                            fullName: e.target.value,

                          });

                        }}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground"
                      />

                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        State *
                      </label>
                      <select
                        required
                        value={shippingDetails.state}
                        onChange={(e) =>
                          setShippingDetails({ ...shippingDetails, state: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground"
                      >
                        <option value="">Select State</option>   {/* 👈 Add this line */}
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Uttarakhand">Uttarakhand</option>
                        <option value="Himachal Pradesh">Himachal Pradesh</option>
                        <option value="Haryana">Haryana</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                        <option value="Chhattisgarh">Chhattisgarh</option>
                        <option value="Bihar">Bihar</option>
                        <option value="Jharkhand">Jharkhand</option>
                      </select>

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={shippingDetails.phone}
                        onChange={(e) => {
                          setShippingDetails({
                            ...shippingDetails,
                            phone: e.target.value,

                          });

                        }}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground"
                      />

                    </div>

                  </div>

                  <div className="mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingDetails.address}
                        onChange={(e) => {
                          setShippingDetails({
                            ...shippingDetails,
                            address: e.target.value,

                          });

                        }}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground"
                      />

                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Delhi, Mumbai"
                        value={shippingDetails.city}
                        onChange={(e) => {
                          setShippingDetails({
                            ...shippingDetails,
                            city: e.target.value,
                          });
                        }}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground"
                      />
                      {totalLocationDiscount > 0 ? (
                        <p className="text-xs text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>
                            Location discount applied for <strong>{trimmedCity}</strong>! (Saved ${totalLocationDiscount.toFixed(2)})
                          </span>
                        </p>
                      ) : availableDiscountCities.length > 0 ? (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-primary flex-shrink-0" />
                          <span>
                            Special discount available for: <strong>{availableDiscountCities.join(", ")}</strong>
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        pincode *
                      </label>
                      <input
                        type="number"
                        required
                        value={shippingDetails.pincode}
                        onChange={(e) => {
                          setShippingDetails({
                            ...shippingDetails,
                            pincode: e.target.value,

                          });

                        }}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground"
                      />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Country *
                      </label>

                      <select
                        required
                        value={shippingDetails.country}
                        onChange={(e) =>
                          setShippingDetails({ ...shippingDetails, country: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground"
                      >
                        <option value="">Select Country</option>   {/* 👈 Add this line */}
                        <option value="India">India</option>
                      </select>

                    </div>

                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 gradient-primary rounded-lg
                   hover:glow-on-hover animate-smooth font-semibold"

                  >
                    Continue to Payment
                  </button>

                </form>

              ) : (
                <PaymentForm />
              )}
            </div>
            {/**ORDER SUMMARY */}
            <div className="lg:col-span-1">
              <div className="glass-panel sticky top-24">
                <h2 className="text-xl font-semibold text-foreground">
                  Order Summary
                </h2>
                <div className="space-y-4 mb-6 max-h-72 overflow-y-auto pr-1">
                  {processedCart.map((item) => {
                    return (
                      <div
                        key={item.product.id}
                        className="flex items-center space-x-3"
                      >
                        <img
                          src={item.product.images?.[0]?.url || "/placeholder.png"}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.product.name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                            {item.isMatch && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                <Tag className="w-2.5 h-2.5" />
                                {item.rulePercent}% OFF ({item.ruleCity})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {item.isMatch ? (
                            <div>
                              <p className="text-xs line-through text-muted-foreground">
                                ${item.originalLineTotal.toFixed(2)}
                              </p>
                              <p className="text-sm font-bold text-emerald-400">
                                ${item.lineTotal.toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm font-semibold text-foreground">
                              ${item.originalLineTotal.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 border-t border-[hsla(var(--glass-border))] pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${rawSubtotal.toFixed(2)}</span>
                  </div>

                  {totalLocationDiscount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Location Discount ({trimmedCity})
                      </span>
                      <span>-${totalLocationDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className={shipping === 0 ? "text-emerald-400 font-medium" : "text-foreground"}>
                      {shipping === 0 ? "Free" : "$2.00"}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (18%)</span>
                    <span className="text-foreground">${tax.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-[hsla(var(--glass-border))]">
                    <span>Total</span>
                    <span className="text-primary font-bold">
                      ${finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </>);
};

export default Payment;
