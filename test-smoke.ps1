$base = "http://localhost:4000"
$email = "buyer$(Get-Random -Maximum 99999)@test.com"

# register
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (@{
  email=$email; password="changeme123"; displayName="Buyer One"
} | ConvertTo-Json)
$reg.tokens

# login
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body (@{
  email=$email; password="changeme123"
} | ConvertTo-Json)
$token = $login.tokens.accessToken

# beats list + pick first id
$beats = Invoke-RestMethod -Method Get -Uri "$base/beats"
$firstBeatId = $beats.items[0]._id
Write-Host "Using beatId: $firstBeatId"

# beat detail
Invoke-RestMethod -Method Get -Uri "$base/beats/$firstBeatId"

# orders (create from cart, then list)
Invoke-RestMethod -Method Post -Uri "$base/me/orders" -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Method Get -Uri "$base/me/orders" -Headers @{ Authorization = "Bearer $token" }

# add to cart
Invoke-RestMethod -Method Post -Uri "$base/me/cart/items" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
  beatId=$firstBeatId; licenseTypeId="lic-basic"; qty=1
} | ConvertTo-Json)

# get cart
Invoke-RestMethod -Method Get -Uri "$base/me/cart" -Headers @{ Authorization = "Bearer $token" }

# favorites toggle/list
Invoke-RestMethod -Method Post -Uri "$base/me/favorites" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
  beatId=$firstBeatId
} | ConvertTo-Json)
Invoke-RestMethod -Method Get -Uri "$base/me/favorites" -Headers @{ Authorization = "Bearer $token" }

# settings get/update
Invoke-RestMethod -Method Get -Uri "$base/me/settings" -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Method Patch -Uri "$base/me/settings" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
  marketingOptIn=$false
} | ConvertTo-Json)

# notifications list (empty)
Invoke-RestMethod -Method Get -Uri "$base/me/notifications" -Headers @{ Authorization = "Bearer $token" }
