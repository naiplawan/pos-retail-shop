'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, ShoppingCart, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { addProductPrice, getAllPrices } from '@/app/api/prices/route';

// Define a type for the items to display in the modal
type ItemEntry = {
  id: string;
  productName: string;
  price: number;
  date: string;
};

// Define a type for the cart items
type CartItem = {
  id: string;
  productName: string;
  price: number;
  quantity: number;
};

const formSchema = z.object({
  productName: z.string().min(2, {
    message: 'กรุณาระบุชื่อสินค้าอย่างน้อย 2 ตัวอักษร',
  }),
  price: z.coerce.number().positive({
    message: 'ราคาต้องเป็นจำนวนบวก',
  }),
  date: z.date({
    required_error: 'กรุณาเลือกวันที่',
  }),
});

type PriceFormProps = {
  onDataChange: () => void;
};

export default function PriceForm({ onDataChange }: PriceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentItems, setRecentItems] = useState<ItemEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Fetch recent items on component mount
  useEffect(() => {
    const fetchRecentItems = async () => {
      try {
        setIsLoading(true);
        const allPrices = await getAllPrices();
        setRecentItems(allPrices.slice(0, 10)); // Just get the 10 most recent items
      } catch (error) {
        console.error('Error fetching recent items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentItems();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      price: 0,
      date: new Date(),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      const result = await addProductPrice({
        productName: values.productName,
        price: values.price,
        date: values.date,
      });

      // Add the new item to the recentItems list
      const newItem: ItemEntry = {
        id: result.id || Date.now().toString(),
        productName: values.productName,
        price: values.price,
        date: format(values.date, 'yyyy-MM-dd'),
      };
      setRecentItems((prev) => [newItem, ...prev.slice(0, 9)]); // Keep only the 10 most recent

      toast.success('บันทึกราคาสินค้าเรียบร้อยแล้ว');
      form.reset({
        productName: '',
        price: undefined,
        date: new Date(),
      });
      onDataChange();
    } catch (error) {
      console.error('Error adding product price:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Add to cart without form submission
  const handleAddToCart = () => {
    const values = form.getValues();

    // Form validation
    if (!values.productName || values.productName.length < 2) {
      toast.error('กรุณาระบุชื่อสินค้าให้ถูกต้อง');
      return;
    }

    if (!values.price || values.price <= 0) {
      toast.error('กรุณาระบุราคาที่ถูกต้อง');
      return;
    }

    // Add the item to cart
    addToCart(values.productName, values.price);
    toast.success('เพิ่มลงตะกร้าเรียบร้อยแล้ว');

    // Reset the form after adding to cart
    form.reset({
      productName: '',
      price: undefined,
      date: new Date(),
    });
  };

  // Add an item to cart
  const addToCart = (productName: string, price: number) => {
    setCartItems((prevCart) => {
      // Check if item already exists in cart
      const existingItemIndex = prevCart.findIndex(
        (item) => item.productName === productName
      );

      if (existingItemIndex >= 0) {
        // Item exists, update quantity
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex].quantity += 1;
        return updatedCart;
      } else {
        // Item doesn't exist, add new item
        return [
          ...prevCart,
          {
            id: Date.now().toString(),
            productName,
            price,
            quantity: 1,
          },
        ];
      }
    });
  };

  // Remove an item from cart
  const removeFromCart = (id: string) => {
    setCartItems((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  // Calculate cart total
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Cart panel - visible on all screen sizes */}
      <div className="w-full md:w-[300px] p-6 border rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ตะกร้าสินค้า</h2>
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
          {cartItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              ไม่มีสินค้าในตะกร้า
            </p>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="p-3 border rounded-md bg-muted/50">
                <div className="flex justify-between items-center">
                  <div className="font-medium">{item.productName}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>จำนวน: {item.quantity}</span>
                  <span>{(item.price * item.quantity).toFixed(2)} บาท</span>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex justify-between font-semibold">
              <span>รวมทั้งหมด</span>
              <span>{cartTotal.toFixed(2)} บาท</span>
            </div>
          </div>
        )}
      </div>

      {/* Form container */}
      <div className="flex-1 p-6 border rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">จดบันทึกรายการสินค้า</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อสินค้า</FormLabel>
                  <FormControl>
                    <Input placeholder="ระบุชื่อสินค้า" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ราคา (บาท)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>วันที่</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: th })
                          ) : (
                            <span>เลือกวันที่</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        locale={th}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                className="flex-1"
                variant="secondary"
                onClick={handleAddToCart}
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มลงตะกร้า
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกราคา'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
